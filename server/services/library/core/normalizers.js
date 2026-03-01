const path = require("path");

const IMAGE_EXT_BY_MIME = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/svg+xml", ".svg"],
]);

function normalizeOpenMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (!mode) return "embed";
  if (mode === "embed") return "embed";
  if (mode === "download") return "download";
  return "";
}

function sanitizeFileName(name, fallback = "asset.bin") {
  const base = path.basename(String(name || "").trim());
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe || fallback;
}

function toPublicPath(key) {
  const normalized = String(key || "").replace(/^\/+/, "");
  return `content/${normalized}`;
}

function toStorageKey(publicPath) {
  return String(publicPath || "")
    .replace(/^\/+/, "")
    .replace(/^content\//, "");
}

function sanitizeJsonValue(value, depth = 0) {
  if (depth > 12) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      const sanitized = sanitizeJsonValue(item, depth + 1);
      if (sanitized !== undefined) out.push(sanitized);
    }
    return out;
  }
  if (!value || typeof value !== "object") return undefined;
  const out = {};
  for (const [rawKey, item] of Object.entries(value)) {
    const key = String(rawKey || "").trim();
    if (!key) continue;
    const sanitized = sanitizeJsonValue(item, depth + 1);
    if (sanitized !== undefined) out[key] = sanitized;
  }
  return out;
}

function normalizeJsonObject(value) {
  if (value === undefined || value === null || value === "") return {};
  if (Array.isArray(value) || typeof value !== "object") return null;
  const out = sanitizeJsonValue(value);
  if (!out || typeof out !== "object" || Array.isArray(out)) return {};
  return out;
}

function normalizeExtensionList(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  const out = [];
  for (const item of source) {
    const ext = String(item || "")
      .trim()
      .replace(/^\./, "")
      .toLowerCase();
    if (!ext) continue;
    if (!/^[a-z0-9_-]{1,24}$/i.test(ext)) continue;
    if (!out.includes(ext)) out.push(ext);
  }
  return out;
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value || "").trim().toLowerCase();
  if (!text) return fallback;
  if (text === "1" || text === "true" || text === "yes" || text === "on") return true;
  if (text === "0" || text === "false" || text === "no" || text === "off") return false;
  return fallback;
}

function normalizeUrlLike(value) {
  return String(value || "").trim();
}

function isAllowedScriptUrl(value) {
  const url = normalizeUrlLike(value);
  if (!url) return false;
  if (url.startsWith("/")) return true;
  return /^https?:\/\//i.test(url);
}

function isAllowedViewerPath(value) {
  const out = normalizeUrlLike(value);
  if (!out) return true;
  if (out.startsWith("/")) return true;
  return /^https?:\/\//i.test(out) || !/^[a-z][a-z0-9+.-]*:/i.test(out);
}

function deriveViewerPath(scriptUrl) {
  const url = normalizeUrlLike(scriptUrl);
  if (!url) return "";
  const pathPart = url.split(/[?#]/)[0];
  if (!pathPart) return "";
  if (pathPart.startsWith("/")) {
    const idx = pathPart.lastIndexOf("/");
    if (idx < 0) return "/viewer.html";
    return `${pathPart.slice(0, idx + 1)}viewer.html`;
  }
  if (/^https?:\/\//i.test(pathPart)) {
    try {
      const u = new URL(pathPart);
      const idx = u.pathname.lastIndexOf("/");
      const dir = idx >= 0 ? u.pathname.slice(0, idx + 1) : "/";
      u.pathname = `${dir}viewer.html`;
      u.search = "";
      u.hash = "";
      return u.toString();
    } catch {
      return "";
    }
  }
  const idx = pathPart.lastIndexOf("/");
  if (idx < 0) return "viewer.html";
  return `${pathPart.slice(0, idx + 1)}viewer.html`;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function normalizeLocalMirrorRelativePath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const clean = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = clean.split("/").filter(Boolean);
  const out = [];
  for (const part of parts) {
    if (part === "." || part === "..") return "";
    out.push(part);
  }
  return out.join("/");
}

function toMirrorRelativePath(baseDirUrl, absoluteUrl) {
  if (!baseDirUrl || !absoluteUrl) return "";
  if (baseDirUrl.origin !== absoluteUrl.origin) return "";
  const pathname = String(absoluteUrl.pathname || "");
  const basePath = String(baseDirUrl.pathname || "");
  if (pathname.startsWith(basePath)) {
    return normalizeLocalMirrorRelativePath(pathname.slice(basePath.length));
  }
  return normalizeLocalMirrorRelativePath(`__root${pathname}`);
}

function toViewerRef(relativePath) {
  const rel = normalizeLocalMirrorRelativePath(relativePath);
  if (!rel) return "";
  return `./${rel}`;
}

function parseHtmlRefs(html) {
  const out = [];
  const text = String(html || "");
  const regex = /<(?:script|link)\b[^>]*(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match = null;
  while ((match = regex.exec(text))) {
    const ref = String(match[1] || "").trim();
    if (!ref) continue;
    out.push(ref);
  }
  return out;
}

function parseJsRefs(jsText) {
  const out = [];
  const text = String(jsText || "");
  const importRegex = /(?:import|export)\s*(?:[^"']*?\sfrom\s*)?["']([^"']+)["']/g;
  const dynamicImportRegex = /import\(\s*["']([^"']+)["']\s*\)/g;
  const importMetaUrlRegex = /new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g;
  for (const regex of [importRegex, dynamicImportRegex, importMetaUrlRegex]) {
    let match = null;
    while ((match = regex.exec(text))) {
      const ref = String(match[1] || "").trim();
      if (!ref) continue;
      out.push(ref);
    }
  }
  return out;
}

function parseCssRefs(cssText) {
  const out = [];
  const text = String(cssText || "");
  const regex = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
  let match = null;
  while ((match = regex.exec(text))) {
    const ref = String(match[1] || "").trim();
    if (!ref) continue;
    out.push(ref);
  }
  return out;
}

function shouldSkipRef(value) {
  const ref = String(value || "").trim().toLowerCase();
  if (!ref) return true;
  if (ref.startsWith("#")) return true;
  if (ref.startsWith("data:")) return true;
  if (ref.startsWith("javascript:")) return true;
  if (ref.startsWith("mailto:")) return true;
  return false;
}

module.exports = {
  IMAGE_EXT_BY_MIME,
  normalizeOpenMode,
  sanitizeFileName,
  toPublicPath,
  toStorageKey,
  normalizeJsonObject,
  normalizeExtensionList,
  normalizeBoolean,
  normalizeUrlLike,
  isAllowedScriptUrl,
  isAllowedViewerPath,
  deriveViewerPath,
  isHttpUrl,
  normalizeLocalMirrorRelativePath,
  toMirrorRelativePath,
  toViewerRef,
  parseHtmlRefs,
  parseJsRefs,
  parseCssRefs,
  shouldSkipRef,
};
