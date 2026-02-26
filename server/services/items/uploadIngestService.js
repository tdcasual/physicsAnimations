const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Readable } = require("stream");
const unzipper = require("unzipper");

const { extractHtmlTitleAndDescription } = require("../../lib/htmlMeta");
const { captureScreenshotQueued, filePathToUrl } = require("../../lib/screenshot");
const { assertPublicHttpUrl } = require("../../lib/ssrf");
const { decodeHtmlBuffer, decodeTextBuffer } = require("../../lib/textEncoding");

function defaultNormalizeCategoryId(categoryId) {
  if (typeof categoryId !== "string") return "other";
  const trimmed = categoryId.trim();
  return trimmed || "other";
}

function guessContentType(filePath) {
  const ext = path.extname(String(filePath || "")).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".wasm": "application/wasm",
    ".txt": "text/plain; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}

function isZipUpload(originalName, fileBuffer) {
  if (typeof originalName === "string" && /\.zip$/i.test(originalName)) return true;
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length < 4) return false;
  return fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b && fileBuffer[2] === 0x03 && fileBuffer[3] === 0x04;
}

function normalizeZipPath(zipPath) {
  const raw = String(zipPath || "").replace(/\\/g, "/");
  const normalized = path.posix.normalize(raw);
  const trimmed = normalized.replace(/^\/+/, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (!parts.length) return null;
  if (parts.some((p) => p === "." || p === "..")) return null;
  if (parts.some((p) => p.includes(":"))) return null;
  if (trimmed.startsWith("../")) return null;
  return parts.join("/");
}

function normalizeExternalHttpLikeUrl(rawUrl) {
  const raw = String(rawUrl || "").trim();
  if (!raw) return null;
  if (/^\/\//.test(raw)) {
    return { key: raw, url: `https:${raw}`, fallbackUrl: `http:${raw}` };
  }
  if (/^https?:\/\//i.test(raw)) return { key: raw, url: raw };
  return null;
}

function listExternalScriptSrcs(html) {
  const out = [];
  const seen = new Set();
  const re =
    /<script\b[^>]*\bsrc\s*=\s*(['"]?)([^'">\s]+)\1[^>]*>\s*<\/script\s*>/gi;
  let match = null;
  while ((match = re.exec(html))) {
    const normalized = normalizeExternalHttpLikeUrl(match[2]);
    if (!normalized || seen.has(normalized.key)) continue;
    seen.add(normalized.key);
    out.push(normalized);
  }
  return out;
}

function parseLinkRel(tag) {
  const match = tag.match(/\brel\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  const rel = String(match?.[1] || match?.[2] || match?.[3] || "").trim().toLowerCase();
  return rel
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function listExternalStylesheetHrefs(html) {
  const out = [];
  const seen = new Set();
  const re = /<link\b[^>]*\bhref\s*=\s*(['"]?)([^'">\s]+)\1[^>]*>/gi;
  let match = null;
  while ((match = re.exec(html))) {
    const tag = match[0];
    const relParts = parseLinkRel(tag);
    if (!relParts.includes("stylesheet")) continue;

    const normalized = normalizeExternalHttpLikeUrl(match[2]);
    if (!normalized || seen.has(normalized.key)) continue;
    seen.add(normalized.key);
    out.push(normalized);
  }
  return out;
}

function rewriteExternalDepsInHtml(html, mapping) {
  let out = typeof html === "string" ? html : "";

  function stripAttrs(tag, attrs) {
    let cleaned = tag;
    for (const attr of attrs) {
      const re = new RegExp(
        `\\s${attr}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`,
        "gi",
      );
      cleaned = cleaned.replace(re, "");
    }
    return cleaned;
  }

  const scriptTagRe =
    /<script\b[^>]*\bsrc\s*=\s*(['"]?)([^'">\s]+)\1[^>]*>\s*<\/script\s*>/gi;
  out = out.replace(scriptTagRe, (tag, _q, src) => {
    const normalized = normalizeExternalHttpLikeUrl(src);
    if (!normalized) return tag;
    const local = mapping.get(normalized.key);
    if (!local) return tag;
    const rewritten = tag.replace(/\bsrc\s*=\s*(['"]?)[^'">\s]+\1/i, `src="${local}"`);
    return stripAttrs(rewritten, ["integrity", "crossorigin"]);
  });

  const linkTagRe = /<link\b[^>]*\bhref\s*=\s*(['"]?)([^'">\s]+)\1[^>]*>/gi;
  out = out.replace(linkTagRe, (tag, _q, href) => {
    const relParts = parseLinkRel(tag);
    if (!relParts.includes("stylesheet")) return tag;

    const normalized = normalizeExternalHttpLikeUrl(href);
    if (!normalized) return tag;
    const local = mapping.get(normalized.key);
    if (!local) return tag;
    const rewritten = tag.replace(/\bhref\s*=\s*(['"]?)[^'">\s]+\1/i, `href="${local}"`);
    return stripAttrs(rewritten, ["integrity", "crossorigin"]);
  });

  return out;
}

async function fetchPublicUrl(rawUrl, { timeoutMs = 15_000, maxRedirects = 5 } = {}) {
  let url = await assertPublicHttpUrl(rawUrl);

  for (let i = 0; i <= maxRedirects; i += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "physicsAnimations-uploader/1.0" },
      });

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get("location");
        if (!location) {
          const err = new Error("external_dep_redirect_invalid");
          err.status = 400;
          throw err;
        }

        const nextUrl = new URL(location, url).toString();
        url = await assertPublicHttpUrl(nextUrl);
        continue;
      }

      return { res, finalUrl: url };
    } catch (err) {
      if (err?.name === "AbortError") {
        const timeoutErr = new Error("external_dep_timeout");
        timeoutErr.status = 408;
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  const err = new Error("external_dep_too_many_redirects");
  err.status = 400;
  throw err;
}

async function readResponseBufferWithLimit(res, maxBytes) {
  const contentLength = Number.parseInt(res.headers.get("content-length") || "0", 10);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    const err = new Error("external_dep_too_large");
    err.status = 413;
    throw err;
  }

  if (!res.body) return Buffer.alloc(0);

  const chunks = [];
  let total = 0;
  for await (const chunk of Readable.fromWeb(res.body)) {
    total += chunk.length;
    if (total > maxBytes) {
      const err = new Error("external_dep_too_large");
      err.status = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total);
}

async function fetchPublicUrlWithFallback(primaryUrl, fallbackUrl, options) {
  if (!fallbackUrl) return fetchPublicUrl(primaryUrl, options);
  try {
    const result = await fetchPublicUrl(primaryUrl, options);
    if (result.res.ok) return result;
  } catch {
    // fall through to try fallback
  }
  return fetchPublicUrl(fallbackUrl, options);
}

function createUploadIngestService({ rootDir, store, deps = {} }) {
  const mutateItemsState = deps.mutateItemsState;
  const normalizeCategoryId = deps.normalizeCategoryId || defaultNormalizeCategoryId;
  const warnScreenshotDeps = deps.warnScreenshotDeps || (() => {});

  if (typeof mutateItemsState !== "function") {
    throw new TypeError("createUploadIngestService requires deps.mutateItemsState");
  }

  async function createLinkItem({ url, title, description, categoryId }) {
    const parsedUrl = await assertPublicHttpUrl(url);

    const now = new Date().toISOString();
    const id = `l_${crypto.randomUUID()}`;

    let thumbnail = "";
    let tmpDir = "";
    try {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-shot-"));
      const outputPath = path.join(tmpDir, `${id}.png`);
      await captureScreenshotQueued({
        rootDir,
        targetUrl: parsedUrl.toString(),
        outputPath,
      });
      const png = fs.readFileSync(outputPath);
      await store.writeBuffer(`thumbnails/${id}.png`, png, { contentType: "image/png" });
      thumbnail = `content/thumbnails/${id}.png`;
    } catch (err) {
      warnScreenshotDeps(err);
    } finally {
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    await mutateItemsState({ store }, (state) => {
      state.items.push({
        id,
        type: "link",
        categoryId: normalizeCategoryId(categoryId),
        url: parsedUrl.toString(),
        title: title || parsedUrl.hostname,
        description,
        thumbnail,
        order: 0,
        published: true,
        hidden: false,
        uploadKind: "html",
        createdAt: now,
        updatedAt: now,
      });
    });

    return { ok: true, id, thumbnail };
  }

  async function createUploadItem({ fileBuffer, originalName, title, description, categoryId }) {
    const isHtml = /\.(html?|htm)$/i.test(originalName);
    const isZip = isZipUpload(originalName, fileBuffer);
    if (!isHtml && !isZip) {
      const err = new Error("invalid_file_type");
      err.status = 400;
      throw err;
    }

    const now = new Date().toISOString();
    const id = `u_${crypto.randomUUID()}`;

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-upload-"));
    let entryRelPath = "index.html";
    let uploadKind = "html";
    const defaultTitle = String(originalName || "").replace(/\.(zip|html?|htm)$/i, "");
    let inferredTitle = "";
    let inferredDescription = "";
    let wroteToStore = false;

    async function writeUploadBuffer(key, buffer, options) {
      wroteToStore = true;
      return store.writeBuffer(key, buffer, options);
    }

    try {
      if (isZip) {
        uploadKind = "zip";
        const maxFiles = 500;
        const maxTotalBytes = 80 * 1024 * 1024;
        const allowedExts = new Set([
          ".html",
          ".htm",
          ".css",
          ".js",
          ".mjs",
          ".json",
          ".png",
          ".jpg",
          ".jpeg",
          ".gif",
          ".svg",
          ".webp",
          ".ico",
          ".woff",
          ".woff2",
          ".ttf",
          ".otf",
          ".mp4",
          ".mp3",
          ".wasm",
          ".txt",
          ".map",
        ]);

        const dir = await unzipper.Open.buffer(fileBuffer);
        const files = (dir.files || []).filter((f) => f.type === "File");
        if (files.length > maxFiles) {
          const err = new Error("too_many_files");
          err.status = 400;
          throw err;
        }

        let total = 0;
        const extracted = [];
        const htmlCandidates = [];
        const htmlMetaByPath = new Map();
        const textExts = new Set([
          ".css",
          ".js",
          ".mjs",
          ".json",
          ".map",
          ".txt",
          ".svg",
        ]);

        for (const file of files) {
          const rel = normalizeZipPath(file.path);
          if (!rel) continue;
          if (rel.startsWith("__MACOSX/")) continue;
          const ext = path.extname(rel).toLowerCase();
          if (!allowedExts.has(ext)) {
            const err = new Error("unsupported_file_type");
            err.status = 400;
            throw err;
          }

          const size = Number(file.uncompressedSize || file.size || 0);
          total += size;
          if (total > maxTotalBytes) {
            const err = new Error("zip_too_large");
            err.status = 400;
            throw err;
          }

          const buf = await file.buffer();
          if (buf.length > 20 * 1024 * 1024) {
            const err = new Error("file_too_large");
            err.status = 413;
            throw err;
          }

          const localPath = path.join(tmpDir, rel);
          fs.mkdirSync(path.dirname(localPath), { recursive: true });

          let outBuf = buf;
          let contentType = guessContentType(rel);
          const extLower = path.extname(rel).toLowerCase();
          if (extLower === ".html" || extLower === ".htm") {
            const html = decodeHtmlBuffer(buf);
            const meta = extractHtmlTitleAndDescription(html);
            htmlMetaByPath.set(rel, meta);
            outBuf = Buffer.from(html, "utf8");
            contentType = "text/html; charset=utf-8";
            htmlCandidates.push(rel);
          } else if (textExts.has(extLower)) {
            const kind = extLower === ".css" ? "css" : "text";
            const text = decodeTextBuffer(buf, { kind });
            outBuf = Buffer.from(text, "utf8");
            contentType = guessContentType(rel);
          }

          fs.writeFileSync(localPath, outBuf);
          await writeUploadBuffer(`uploads/${id}/${rel}`, outBuf, { contentType });
          extracted.push(rel);
        }

        const indexCandidates = htmlCandidates
          .filter((p) => /(^|\/)index\.html?$/i.test(p))
          .sort((a, b) => a.split("/").length - b.split("/").length);

        entryRelPath = indexCandidates[0] || htmlCandidates[0] || "";
        if (!entryRelPath) {
          const err = new Error("missing_index_html");
          err.status = 400;
          throw err;
        }

        const entryMeta = htmlMetaByPath.get(entryRelPath);
        inferredTitle = entryMeta?.title || "";
        inferredDescription = entryMeta?.description || "";

        const manifest = {
          version: 1,
          id,
          entry: entryRelPath,
          files: extracted,
          createdAt: now,
        };
        await writeUploadBuffer(
          `uploads/${id}/manifest.json`,
          Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
          { contentType: "application/json; charset=utf-8" },
        );
      } else {
        const html = decodeHtmlBuffer(fileBuffer);
        const meta = extractHtmlTitleAndDescription(html);
        inferredTitle = meta.title || "";
        inferredDescription = meta.description || "";

        const scripts = listExternalScriptSrcs(html);
        const styles = listExternalStylesheetHrefs(html);
        const externalDeps = [
          ...scripts.map((dep) => ({ ...dep, kind: "js" })),
          ...styles.map((dep) => ({ ...dep, kind: "css" })),
        ];

        const maxDeps = 20;
        if (externalDeps.length > maxDeps) {
          const err = new Error("external_dep_too_many");
          err.status = 400;
          throw err;
        }

        const depMapping = new Map();
        const downloaded = [];
        let totalDepBytes = 0;
        const maxDepBytes = 10 * 1024 * 1024;
        const maxTotalDepBytes = 30 * 1024 * 1024;

        for (const dep of externalDeps) {
          if (depMapping.has(dep.key)) continue;

          const hash = crypto.createHash("sha256").update(dep.key).digest("hex").slice(0, 16);
          const rel = `deps/${hash}.${dep.kind}`;

          const { res } = await fetchPublicUrlWithFallback(dep.url, dep.fallbackUrl);
          if (!res.ok) {
            const err = new Error("external_dep_download_failed");
            err.status = 400;
            throw err;
          }

          const buf = await readResponseBufferWithLimit(res, maxDepBytes);
          totalDepBytes += buf.length;
          if (totalDepBytes > maxTotalDepBytes) {
            const err = new Error("external_dep_total_too_large");
            err.status = 413;
            throw err;
          }

          depMapping.set(dep.key, rel);
          downloaded.push(rel);

          const localPath = path.join(tmpDir, rel);
          fs.mkdirSync(path.dirname(localPath), { recursive: true });
          fs.writeFileSync(localPath, buf);
          await writeUploadBuffer(`uploads/${id}/${rel}`, buf, { contentType: guessContentType(rel) });
        }

        const rewrittenHtml = depMapping.size ? rewriteExternalDepsInHtml(html, depMapping) : html;
        const uploadKey = `uploads/${id}/index.html`;
        await writeUploadBuffer(uploadKey, Buffer.from(rewrittenHtml, "utf8"), {
          contentType: "text/html; charset=utf-8",
        });
        fs.writeFileSync(path.join(tmpDir, "index.html"), rewrittenHtml, "utf8");
        const manifestFiles = ["index.html", ...downloaded];
        await writeUploadBuffer(
          `uploads/${id}/manifest.json`,
          Buffer.from(
            `${JSON.stringify({ version: 1, id, entry: "index.html", files: manifestFiles, createdAt: now }, null, 2)}\n`,
            "utf8",
          ),
          { contentType: "application/json; charset=utf-8" },
        );
      }

      let thumbnail = "";
      try {
        const entryPath = path.join(tmpDir, entryRelPath);
        const outputPath = path.join(tmpDir, `${id}.png`);
        await captureScreenshotQueued({
          rootDir,
          targetUrl: filePathToUrl(entryPath),
          outputPath,
          allowedFileRoot: tmpDir,
        });
        const png = fs.readFileSync(outputPath);
        await writeUploadBuffer(`thumbnails/${id}.png`, png, { contentType: "image/png" });
        thumbnail = `content/thumbnails/${id}.png`;
      } catch (err) {
        warnScreenshotDeps(err);
      }

      await mutateItemsState({ store }, (state) => {
        state.items.push({
          id,
          type: "upload",
          categoryId: normalizeCategoryId(categoryId),
          path: `content/uploads/${id}/${entryRelPath}`,
          title: title || inferredTitle || defaultTitle,
          description: description || inferredDescription,
          thumbnail,
          order: 0,
          published: true,
          hidden: false,
          uploadKind,
          createdAt: now,
          updatedAt: now,
        });
      });

      return { ok: true, id, thumbnail };
    } catch (err) {
      if (wroteToStore) {
        await store.deletePath(`uploads/${id}`, { recursive: true }).catch(() => {});
        await store.deletePath(`thumbnails/${id}.png`).catch(() => {});
      }
      throw err;
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  return {
    createLinkItem,
    createUploadItem,
  };
}

module.exports = {
  createUploadIngestService,
};

