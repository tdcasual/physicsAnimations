const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Readable } = require("stream");
const express = require("express");
const multer = require("multer");
const unzipper = require("unzipper");
const { z } = require("zod");

const { requireAuth, optionalAuth } = require("../lib/auth");
const { listBuiltinItems, findBuiltinItem } = require("../lib/animationsIndex");
const { extractHtmlTitleAndDescription } = require("../lib/htmlMeta");
const { captureScreenshotQueued, filePathToUrl } = require("../lib/screenshot");
const { assertPublicHttpUrl } = require("../lib/ssrf");
const {
  loadItemsState,
  mutateItemsState,
  loadBuiltinItemsState,
  mutateBuiltinItemsState,
  mutateItemTombstonesState,
  noSave,
} = require("../lib/state");
const { sanitizeUploadedHtml } = require("../lib/uploadSecurity");
const { decodeHtmlBuffer, decodeTextBuffer } = require("../lib/textEncoding");
const { parseWithSchema, idSchema } = require("../lib/validation");
const { asyncHandler } = require("../middleware/asyncHandler");
const { rateLimit } = require("../middleware/rateLimit");

function safeText(text) {
  if (typeof text !== "string") return "";
  return text;
}

function normalizeCategoryId(categoryId) {
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

function toApiItem(item) {
  if (item.type === "builtin") {
    return {
      id: item.id,
      type: "builtin",
      categoryId: item.categoryId,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      order: item.order || 0,
      published: item.published !== false,
      hidden: item.hidden === true,
      deleted: item.deleted === true,
      src: `animations/${item.id}`,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  const src = item.type === "link" ? item.url : item.path;
  return {
    id: item.id,
    type: item.type,
    categoryId: item.categoryId,
    title: item.title,
    description: item.description,
    thumbnail: item.thumbnail,
    order: item.order || 0,
    published: item.published !== false,
    hidden: item.hidden === true,
    deleted: false,
    src,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function createWarnScreenshotDeps() {
  let didWarn = false;
  return (err) => {
    if (didWarn) return;
    didWarn = true;
    console.error("[screenshot] Failed to generate thumbnails.");
    console.error("[screenshot] Try: `npm run install-playwright-deps`");
    if (err?.message) console.error(`[screenshot] ${err.message}`);
  };
}

function createItemsRouter({ rootDir, authConfig, store }) {
  const router = express.Router();
  const authRequired = requireAuth({ authConfig });
  const authOptional = optionalAuth({ authConfig });
  const warnScreenshotDeps = createWarnScreenshotDeps();

  function loadBuiltinIndex() {
    return listBuiltinItems({ rootDir }).map((item) => ({
      id: item.id,
      type: "builtin",
      categoryId: item.categoryId,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      order: 0,
      published: true,
      hidden: false,
      createdAt: "",
      updatedAt: "",
    }));
  }

  async function loadBuiltinItems({ includeDeleted = false } = {}) {
    const base = loadBuiltinIndex();
    if (!base.length) return [];

    const state = await loadBuiltinItemsState({ store });
    const overrides =
      state?.items && typeof state.items === "object" ? state.items : {};

    const merged = [];
    for (const item of base) {
      const override = overrides[item.id];
      if (override?.deleted === true && !includeDeleted) continue;

      const out = { ...item };
      if (typeof override?.title === "string" && override.title.trim()) out.title = override.title.trim();
      if (typeof override?.description === "string") out.description = override.description;
      if (typeof override?.categoryId === "string" && override.categoryId.trim()) {
        out.categoryId = normalizeCategoryId(override.categoryId);
      }
      if (Number.isFinite(override?.order)) out.order = Math.trunc(override.order);
      if (typeof override?.published === "boolean") out.published = override.published;
      if (typeof override?.hidden === "boolean") out.hidden = override.hidden;
      if (typeof override?.updatedAt === "string") out.updatedAt = override.updatedAt;
      if (override?.deleted === true) out.deleted = true;

      merged.push(out);
    }

    return merged;
  }

  async function findBuiltinItemById(id, { includeDeleted = false } = {}) {
    const base = findBuiltinItem({ rootDir, id });
    if (!base) return null;

    const state = await loadBuiltinItemsState({ store });
    const override = state?.items?.[id];
    if (override?.deleted === true && !includeDeleted) return null;

    const out = {
      id: base.id,
      type: "builtin",
      categoryId: base.categoryId,
      title: base.title,
      description: base.description,
      thumbnail: base.thumbnail,
      order: 0,
      published: true,
      hidden: false,
      createdAt: "",
      updatedAt: "",
    };
    if (typeof override?.title === "string" && override.title.trim()) out.title = override.title.trim();
    if (typeof override?.description === "string") out.description = override.description;
    if (typeof override?.categoryId === "string" && override.categoryId.trim()) {
      out.categoryId = normalizeCategoryId(override.categoryId);
    }
    if (Number.isFinite(override?.order)) out.order = Math.trunc(override.order);
    if (typeof override?.published === "boolean") out.published = override.published;
    if (typeof override?.hidden === "boolean") out.hidden = override.hidden;
    if (typeof override?.updatedAt === "string") out.updatedAt = override.updatedAt;
    if (override?.deleted === true) out.deleted = true;

    return out;
  }

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
  });

  const listQuerySchema = z.object({
    q: z.string().optional(),
    categoryId: z.string().optional(),
    type: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(24),
  });

  const createLinkSchema = z.object({
    type: z.literal("link").optional().default("link"),
    url: z.string().min(1).max(2048),
    categoryId: z.string().optional().default("other"),
    title: z.string().optional().default(""),
    description: z.string().optional().default(""),
  });

  const updateItemSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    categoryId: z.string().optional(),
    order: z.coerce.number().int().min(-100000).max(100000).optional(),
    published: z.boolean().optional(),
    hidden: z.boolean().optional(),
    deleted: z.boolean().optional(),
  });

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
            const sanitized = sanitizeUploadedHtml(html, { allowLocalScripts: true });
            outBuf = Buffer.from(sanitized, "utf8");
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
        const sanitizedHtml = sanitizeUploadedHtml(rewrittenHtml, { allowLocalScripts: true });
        const uploadKey = `uploads/${id}/index.html`;
        await writeUploadBuffer(uploadKey, Buffer.from(sanitizedHtml, "utf8"), {
          contentType: "text/html; charset=utf-8",
        });
        fs.writeFileSync(path.join(tmpDir, "index.html"), sanitizedHtml, "utf8");
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

  router.get(
    "/items",
    authOptional,
    asyncHandler(async (req, res) => {
      const isAdmin = req.user?.role === "admin";
      const query = parseWithSchema(listQuerySchema, req.query);
      const q = (query.q || "").trim().toLowerCase();
      const categoryId = (query.categoryId || "").trim();
      const type = (query.type || "").trim();

      const state = await loadItemsState({ store });
      const builtinItems = await loadBuiltinItems({ includeDeleted: isAdmin });
      let items = [...state.items, ...builtinItems];

      if (!isAdmin) items = items.filter((it) => it.published !== false && it.hidden !== true);
      if (categoryId) items = items.filter((it) => it.categoryId === categoryId);
      if (type) items = items.filter((it) => it.type === type);
      if (q) {
        items = items.filter((it) => {
          const hay = `${it.title || ""}\n${it.description || ""}\n${it.url || ""}\n${it.path || ""}\n${it.id || ""}`.toLowerCase();
          return hay.includes(q);
        });
      }

      items.sort((a, b) => {
        const timeDiff = (b.createdAt || "").localeCompare(a.createdAt || "");
        if (timeDiff) return timeDiff;
        const deletedDiff = Number(a.deleted === true) - Number(b.deleted === true);
        if (deletedDiff) return deletedDiff;
        return safeText(a.title).localeCompare(safeText(b.title), "zh-CN");
      });

      const total = items.length;
      const start = (query.page - 1) * query.pageSize;
      const pageItems = items.slice(start, start + query.pageSize).map(toApiItem);

      res.json({ items: pageItems, page: query.page, pageSize: query.pageSize, total });
    }),
  );

  router.post(
    "/items",
    authRequired,
    rateLimit({ key: "items_write", windowMs: 60 * 60 * 1000, max: 120 }),
    (req, res, next) => {
      if (req.is("multipart/form-data")) {
        upload.single("file")(req, res, next);
        return;
      }
      next();
    },
    asyncHandler(async (req, res) => {
      if (req.file?.buffer?.length) {
        const categoryId = normalizeCategoryId(req.body?.categoryId);
        const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
        const description =
          typeof req.body?.description === "string" ? req.body.description.trim() : "";
        const originalName =
          typeof req.file.originalname === "string" ? req.file.originalname : "upload.html";

        const created = await createUploadItem({
          fileBuffer: req.file.buffer,
          originalName,
          title,
          description,
          categoryId,
        });
        res.json(created);
        return;
      }

      const body = parseWithSchema(createLinkSchema, req.body);
      const created = await createLinkItem({
        url: body.url,
        categoryId: body.categoryId,
        title: body.title,
        description: body.description,
      });
      res.json(created);
    }),
  );

  router.put(
    "/items/:id",
    authRequired,
    rateLimit({ key: "items_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const body = parseWithSchema(updateItemSchema, req.body);

      if (
        body.title === undefined &&
        body.description === undefined &&
        body.categoryId === undefined &&
        body.order === undefined &&
        body.published === undefined &&
        body.hidden === undefined &&
        body.deleted === undefined
      ) {
        res.status(400).json({ error: "no_changes" });
        return;
      }

      const dynamicResult = await mutateItemsState({ store }, (state) => {
        const dynamicItem = state.items.find((it) => it.id === id);
        if (!dynamicItem) return noSave(null);
        if (body.deleted !== undefined) return noSave({ __kind: "unsupported_change" });

        if (body.title !== undefined) dynamicItem.title = body.title;
        if (body.description !== undefined) dynamicItem.description = body.description;
        if (body.categoryId !== undefined) dynamicItem.categoryId = normalizeCategoryId(body.categoryId);
        if (body.order !== undefined) dynamicItem.order = body.order;
        if (body.published !== undefined) dynamicItem.published = body.published;
        if (body.hidden !== undefined) dynamicItem.hidden = body.hidden;

        dynamicItem.updatedAt = new Date().toISOString();
        return dynamicItem;
      });

      if (dynamicResult?.__kind === "unsupported_change") {
        res.status(400).json({ error: "unsupported_change" });
        return;
      }
      if (dynamicResult) {
        res.json({ ok: true, item: toApiItem(dynamicResult) });
        return;
      }

      const builtinBase = loadBuiltinIndex().find((it) => it.id === id);
      if (!builtinBase) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      await mutateBuiltinItemsState({ store }, (builtinState) => {
        if (!builtinState.items) builtinState.items = {};
        const current =
          builtinState.items[id] && typeof builtinState.items[id] === "object"
            ? { ...builtinState.items[id] }
            : {};

        if (body.title !== undefined) {
          const title = String(body.title || "").trim();
          if (!title) delete current.title;
          else current.title = title;
        }
        if (body.description !== undefined) {
          const desc = String(body.description || "");
          if (!desc.trim()) delete current.description;
          else current.description = desc;
        }
        if (body.categoryId !== undefined) {
          const raw = String(body.categoryId || "").trim();
          if (!raw) delete current.categoryId;
          else current.categoryId = normalizeCategoryId(raw);
        }
        if (body.order !== undefined) current.order = body.order;
        if (body.published !== undefined) current.published = body.published;
        if (body.hidden !== undefined) current.hidden = body.hidden;
        if (body.deleted === true) current.deleted = true;
        if (body.deleted === false) delete current.deleted;

        current.updatedAt = new Date().toISOString();

        const hasAnyOverride = Object.entries(current).some(
          ([k, v]) => k !== "updatedAt" && v !== undefined,
        );
        if (hasAnyOverride) builtinState.items[id] = current;
        else delete builtinState.items[id];
      });

      const updated = await findBuiltinItemById(id, { includeDeleted: true });
      if (!updated) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      res.json({ ok: true, item: toApiItem(updated) });
    }),
  );

  router.post(
    "/items/link",
    authRequired,
    rateLimit({ key: "items_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const body = parseWithSchema(createLinkSchema, { ...req.body, type: "link" });
      const created = await createLinkItem({
        url: body.url,
        categoryId: body.categoryId,
        title: body.title,
        description: body.description,
      });
      res.json(created);
    }),
  );

  router.post(
    "/items/upload",
    authRequired,
    rateLimit({ key: "items_write", windowMs: 60 * 60 * 1000, max: 120 }),
    upload.single("file"),
    asyncHandler(async (req, res) => {
      const categoryId = normalizeCategoryId(req.body?.categoryId);
      const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
      const description =
        typeof req.body?.description === "string" ? req.body.description.trim() : "";

      if (!req.file?.buffer?.length) {
        res.status(400).json({ error: "missing_file" });
        return;
      }

      const originalName = typeof req.file.originalname === "string" ? req.file.originalname : "";

      const created = await createUploadItem({
        fileBuffer: req.file.buffer,
        originalName,
        title,
        description,
        categoryId,
      });
      res.json(created);
    }),
  );

  router.get(
    "/items/:id",
    authOptional,
    asyncHandler(async (req, res) => {
      const isAdmin = req.user?.role === "admin";
      const id = parseWithSchema(idSchema, req.params.id);

      const state = await loadItemsState({ store });
      const item = state.items.find((it) => it.id === id);
      if (item) {
        if (!isAdmin && (item.published === false || item.hidden === true)) {
          res.status(404).json({ error: "not_found" });
          return;
        }
        res.json({ item: toApiItem(item) });
        return;
      }

      const builtin = await findBuiltinItemById(id, { includeDeleted: isAdmin });
      if (!builtin) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      if (!isAdmin && (builtin.published === false || builtin.hidden === true)) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      res.json({ item: toApiItem(builtin) });
    }),
  );

  router.post(
    "/items/:id/screenshot",
    authRequired,
    rateLimit({ key: "items_screenshot", windowMs: 60 * 60 * 1000, max: 60 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);

      const item = await mutateItemsState({ store }, (state) => {
        const found = state.items.find((it) => it.id === id);
        if (!found) return noSave(null);
        return noSave({
          id: found.id,
          type: found.type,
          url: found.url,
          path: found.path,
        });
      });
      if (!item) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      const now = new Date().toISOString();
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-shot-"));
      const outputPath = path.join(tmpDir, `${id}.png`);

      try {
        if (item.type === "upload" && store.mode === "webdav") {
          const manifestRaw = await store.readBuffer(`uploads/${id}/manifest.json`);
          let manifest = null;
          if (manifestRaw) {
            try {
              manifest = JSON.parse(manifestRaw.toString("utf8"));
            } catch {
              manifest = null;
            }
          }

          const entryRaw =
            typeof manifest?.entry === "string" && manifest.entry ? manifest.entry : "index.html";
          const entry = normalizeZipPath(entryRaw) || "index.html";
          const files = Array.isArray(manifest?.files) ? manifest.files : [entry];

          for (const rel of files) {
            const normalized = normalizeZipPath(rel);
            if (!normalized) continue;
            const buf = await store.readBuffer(`uploads/${id}/${normalized}`);
            if (!buf) continue;
            const localPath = path.join(tmpDir, normalized);
            fs.mkdirSync(path.dirname(localPath), { recursive: true });
            fs.writeFileSync(localPath, buf);
          }

          const entryPath = path.join(tmpDir, entry);
          if (!fs.existsSync(entryPath)) {
            res.status(404).json({ error: "not_found" });
            return;
          }

          await captureScreenshotQueued({
            rootDir,
            targetUrl: filePathToUrl(entryPath),
            outputPath,
            allowedFileRoot: tmpDir,
          });
        } else {
          const targetUrl =
            item.type === "link"
              ? (await assertPublicHttpUrl(item.url)).toString()
              : filePathToUrl(path.join(rootDir, item.path));
          const allowedFileRoot =
            item.type === "upload" ? path.join(rootDir, "content", "uploads", id) : undefined;
          await captureScreenshotQueued({ rootDir, targetUrl, outputPath, allowedFileRoot });
        }

        const png = fs.readFileSync(outputPath);
        await store.writeBuffer(`thumbnails/${id}.png`, png, { contentType: "image/png" });

        const thumbnail = await mutateItemsState({ store }, (state) => {
          const found = state.items.find((it) => it.id === id);
          if (!found) return noSave(null);
          found.thumbnail = `content/thumbnails/${id}.png`;
          found.updatedAt = now;
          return found.thumbnail;
        });
        if (!thumbnail) {
          await store.deletePath(`thumbnails/${id}.png`).catch(() => {});
          res.status(404).json({ error: "not_found" });
          return;
        }

        res.json({ ok: true, thumbnail });
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }),
  );

  router.delete(
    "/items/:id",
    authRequired,
    rateLimit({ key: "items_write", windowMs: 60 * 60 * 1000, max: 120 }),
    asyncHandler(async (req, res) => {
      const id = parseWithSchema(idSchema, req.params.id);
      const deletedAt = new Date().toISOString();

      const deleted = await mutateItemsState({ store }, async (state) => {
        const before = state.items.length;
        const item = state.items.find((it) => it.id === id);
        state.items = state.items.filter((it) => it.id !== id);
        if (!item || state.items.length === before) return noSave(null);

        if (item.type === "upload") {
          await store.deletePath(`uploads/${id}`, { recursive: true });
        }
        if (item.thumbnail) {
          await store.deletePath(`thumbnails/${id}.png`);
        }

        return item;
      });
      if (deleted) {
        await mutateItemTombstonesState({ store }, (tombstones) => {
          if (!tombstones.tombstones) tombstones.tombstones = {};
          tombstones.tombstones[id] = { deletedAt };
        }).catch(() => {});
        res.json({ ok: true });
        return;
      }

      const builtinBase = loadBuiltinIndex().find((it) => it.id === id);
      if (!builtinBase) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      await mutateBuiltinItemsState({ store }, (builtinState) => {
        if (!builtinState.items) builtinState.items = {};
        const current =
          builtinState.items[id] && typeof builtinState.items[id] === "object"
            ? { ...builtinState.items[id] }
            : {};

        current.deleted = true;
        current.updatedAt = new Date().toISOString();
        builtinState.items[id] = current;
      });

      res.json({ ok: true });
    }),
  );

  return router;
}

module.exports = {
  createItemsRouter,
};
