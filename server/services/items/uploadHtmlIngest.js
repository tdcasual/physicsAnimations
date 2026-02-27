const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const { extractHtmlTitleAndDescription: defaultExtractHtmlTitleAndDescription } = require("../../lib/htmlMeta");
const { assertPublicHttpUrl: defaultAssertPublicHttpUrl } = require("../../lib/ssrf");
const { decodeHtmlBuffer: defaultDecodeHtmlBuffer } = require("../../lib/textEncoding");
const { guessContentType } = require("./uploadIngestUtils");

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

async function fetchPublicUrl(
  rawUrl,
  { assertPublicHttpUrl, timeoutMs = 15_000, maxRedirects = 5 } = {},
) {
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

async function ingestHtmlUpload({
  fileBuffer,
  id,
  now,
  tmpDir,
  writeUploadBuffer,
  deps = {},
}) {
  const decodeHtmlBuffer = deps.decodeHtmlBuffer || defaultDecodeHtmlBuffer;
  const extractHtmlTitleAndDescription =
    deps.extractHtmlTitleAndDescription || defaultExtractHtmlTitleAndDescription;
  const assertPublicHttpUrl = deps.assertPublicHttpUrl || defaultAssertPublicHttpUrl;

  const html = decodeHtmlBuffer(fileBuffer);
  const meta = extractHtmlTitleAndDescription(html);
  const inferredTitle = meta.title || "";
  const inferredDescription = meta.description || "";

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

    const { res } = await fetchPublicUrlWithFallback(dep.url, dep.fallbackUrl, {
      assertPublicHttpUrl,
    });
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
  await writeUploadBuffer(`uploads/${id}/index.html`, Buffer.from(rewrittenHtml, "utf8"), {
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

  return {
    uploadKind: "html",
    entryRelPath: "index.html",
    inferredTitle,
    inferredDescription,
  };
}

module.exports = {
  ingestHtmlUpload,
};
