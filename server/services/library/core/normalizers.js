const path = require("path");

const IMAGE_EXT_BY_MIME = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/svg+xml", ".svg"],
]);

const FORBIDDEN_JSON_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const SYNC_OPTION_NUMERIC_RANGES = {
  maxFiles: { min: 1, max: 2000 },
  maxTotalBytes: { min: 16 * 1024, max: 512 * 1024 * 1024 },
  maxFileBytes: { min: 1024, max: 128 * 1024 * 1024 },
  timeoutMs: { min: 10, max: 120000 },
  concurrency: { min: 1, max: 16 },
  keepReleases: { min: 1, max: 20 },
  retryMaxAttempts: { min: 1, max: 8 },
  retryBaseDelayMs: { min: 1, max: 10000 },
};

function normalizeOpenMode(value) {
  const mode = String(value || "").trim().toLowerCase();
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
    if (FORBIDDEN_JSON_KEYS.has(key)) continue;
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

function toIntInRange(value, { min, max }, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  if (!Number.isFinite(normalized)) return fallback;
  if (normalized < min || normalized > max) return fallback;
  return normalized;
}

function normalizeSyncOptions(value, fallback = {}) {
  if (value === undefined || value === null || value === "") return { ...fallback };
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...fallback };

  const out = { ...fallback };
  for (const [key, range] of Object.entries(SYNC_OPTION_NUMERIC_RANGES)) {
    if (value[key] === undefined) continue;
    out[key] = toIntInRange(value[key], range, fallback[key]);
  }
  if (value.strictSelfCheck !== undefined) {
    out.strictSelfCheck = normalizeBoolean(value.strictSelfCheck, fallback.strictSelfCheck !== false);
  }
  return out;
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

function parseSrcsetRefs(value) {
  const out = [];
  const text = String(value || "").trim();
  if (!text) return out;
  for (const candidate of text.split(",")) {
    const part = String(candidate || "").trim();
    if (!part) continue;
    const firstWs = part.search(/\s/);
    const ref = (firstWs === -1 ? part : part.slice(0, firstWs)).trim();
    if (!ref) continue;
    out.push(ref);
  }
  return out;
}

function parseHtmlMediaRefs(html) {
  const out = [];
  const text = String(html || "");
  const tagRegex = /<(?:img|source|video|audio|track)\b[^>]*>/gi;
  let tagMatch = null;
  while ((tagMatch = tagRegex.exec(text))) {
    const tag = String(tagMatch[0] || "");
    if (!tag) continue;

    const attrRegex = /\b(?:src|poster)\s*=\s*["']([^"']+)["']/gi;
    let attrMatch = null;
    while ((attrMatch = attrRegex.exec(tag))) {
      const ref = String(attrMatch[1] || "").trim();
      if (!ref) continue;
      out.push(ref);
    }

    const srcsetRegex = /\bsrcset\s*=\s*["']([^"']+)["']/gi;
    let srcsetMatch = null;
    while ((srcsetMatch = srcsetRegex.exec(tag))) {
      for (const ref of parseSrcsetRefs(srcsetMatch[1])) {
        out.push(ref);
      }
    }
  }
  return out;
}

function parseHtmlInlineStyleRefs(html) {
  const out = [];
  const text = String(html || "");

  const styleTagRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let styleTagMatch = null;
  while ((styleTagMatch = styleTagRegex.exec(text))) {
    for (const ref of parseCssRefs(styleTagMatch[1])) out.push(ref);
  }

  const styleAttrRegex = /\bstyle\s*=\s*["']([^"']+)["']/gi;
  let styleAttrMatch = null;
  while ((styleAttrMatch = styleAttrRegex.exec(text))) {
    for (const ref of parseCssRefs(styleAttrMatch[1])) out.push(ref);
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
  // Fallback scanner: captures dynamic imports with options, e.g. import("./x.js", {...})
  for (let i = 0; i < text.length; i += 1) {
    if (!text.startsWith("import", i)) continue;
    const prev = i > 0 ? text[i - 1] : "";
    if (/[a-zA-Z0-9_$]/.test(prev)) continue;
    let j = i + "import".length;
    while (j < text.length && /\s/.test(text[j])) j += 1;
    if (text[j] !== "(") continue;
    j += 1;
    while (j < text.length && /\s/.test(text[j])) j += 1;
    const quote = text[j];
    if (quote !== "'" && quote !== '"') continue;
    j += 1;
    let value = "";
    while (j < text.length) {
      const ch = text[j];
      if (ch === "\\") {
        const next = text[j + 1] || "";
        value += next;
        j += 2;
        continue;
      }
      if (ch === quote) break;
      value += ch;
      j += 1;
    }
    if (value.trim()) out.push(value.trim());
  }
  return out;
}

function collectCssFuncArg(text, startIndex) {
  let i = startIndex;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  if (text[i] !== "(") return { value: "", nextIndex: startIndex };
  i += 1;
  let value = "";
  let quote = "";
  while (i < text.length) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") {
        const next = text[i + 1] || "";
        value += ch + next;
        i += 2;
        continue;
      }
      if (ch === quote) {
        quote = "";
        value += ch;
        i += 1;
        continue;
      }
      value += ch;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      value += ch;
      i += 1;
      continue;
    }
    if (ch === ")") {
      i += 1;
      break;
    }
    value += ch;
    i += 1;
  }
  return { value: value.trim(), nextIndex: i };
}

function unwrapCssString(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const quote = text[0];
  if ((quote === "'" || quote === '"') && text[text.length - 1] === quote) {
    return text.slice(1, -1).trim();
  }
  return text;
}

function parseCssRefs(cssText) {
  const out = [];
  const text = String(cssText || "");
  const quotedUrlRegex = /url\(\s*(['"])([^"']+)\1\s*\)/gi;
  let match = null;
  while ((match = quotedUrlRegex.exec(text))) {
    const ref = String(match[2] || "").trim();
    if (!ref) continue;
    out.push(ref);
  }
  const plainUrlRegex = /url\(\s*([^"'()\s][^()]*?)\s*\)/gi;
  let plainMatch = null;
  while ((plainMatch = plainUrlRegex.exec(text))) {
    const ref = String(plainMatch[1] || "").trim();
    if (!ref) continue;
    out.push(ref);
  }
  const importRegex = /@import\s+(?:url\(\s*)?['"]([^'"]+)['"]\s*\)?/gi;
  let importMatch = null;
  while ((importMatch = importRegex.exec(text))) {
    const ref = String(importMatch[1] || "").trim();
    if (!ref) continue;
    out.push(ref);
  }
  const importUrlRegex = /@import\s+url\(\s*([^'")\s][^)]*)\s*\)/gi;
  let importUrlMatch = null;
  while ((importUrlMatch = importUrlRegex.exec(text))) {
    const ref = String(importUrlMatch[1] || "").trim();
    if (!ref) continue;
    out.push(ref);
  }
  // Fallback scanner for complex url()/@import arguments that break simple regex.
  for (let i = 0; i < text.length; i += 1) {
    if (text.startsWith("url", i)) {
      const { value, nextIndex } = collectCssFuncArg(text, i + 3);
      const ref = unwrapCssString(value);
      if (ref) out.push(ref);
      if (nextIndex > i) i = nextIndex - 1;
      continue;
    }
    if (!text.startsWith("@import", i)) continue;
    let j = i + "@import".length;
    while (j < text.length && /\s/.test(text[j])) j += 1;
    if (text.startsWith("url", j)) {
      const { value, nextIndex } = collectCssFuncArg(text, j + 3);
      const ref = unwrapCssString(value);
      if (ref) out.push(ref);
      if (nextIndex > i) i = nextIndex - 1;
      continue;
    }
    const quote = text[j];
    if (quote !== "'" && quote !== '"') continue;
    j += 1;
    let ref = "";
    while (j < text.length && text[j] !== quote) {
      if (text[j] === "\\") {
        const next = text[j + 1] || "";
        ref += next;
        j += 2;
        continue;
      }
      ref += text[j];
      j += 1;
    }
    if (ref.trim()) out.push(ref.trim());
  }
  const deduped = [];
  const seen = new Set();
  for (const item of out) {
    const ref = String(item || "").trim();
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    deduped.push(ref);
  }
  return deduped;
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
  normalizeSyncOptions,
  normalizeUrlLike,
  isAllowedScriptUrl,
  isAllowedViewerPath,
  deriveViewerPath,
  isHttpUrl,
  normalizeLocalMirrorRelativePath,
  toMirrorRelativePath,
  toViewerRef,
  parseHtmlRefs,
  parseHtmlMediaRefs,
  parseHtmlInlineStyleRefs,
  parseJsRefs,
  parseCssRefs,
  shouldSkipRef,
};
