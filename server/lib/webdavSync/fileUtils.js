const fs = require("fs");
const path = require("path");
const { extractHtmlTitleAndDescription } = require("../htmlMeta");

const SKIP_FILES = new Set([".jwt_secret", "system.json"]);

function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;

  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.isFile()) out.push(full);
    }
  }
  return out;
}

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".json": "application/json; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
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
    ".ggb": "application/vnd.geogebra.file",
  };
  return map[ext] || "application/octet-stream";
}

function shouldSkip(relPath) {
  const normalized = String(relPath || "").split(path.sep).join("/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  const baseName = segments.length ? segments[segments.length - 1] : path.basename(normalized);

  for (const segment of segments) {
    if (segment.startsWith(".") && segment !== ".well-known") return true;
  }

  if (SKIP_FILES.has(baseName)) return true;
  if (/^state\.sqlite(?:-(?:wal|shm|journal))?$/i.test(baseName)) return true;
  return false;
}

function readLocalBuffer({ rootDir, key }) {
  const filePath = path.join(rootDir, "content", key);
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

function writeLocalBuffer({ rootDir, key, buffer }) {
  const filePath = path.join(rootDir, "content", key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

function parseJsonBuffer(buf) {
  if (!buf || !buf.length) return null;
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    return null;
  }
}

function serializeJson(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeRemotePath(value) {
  const cleaned = String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const normalized = path.posix.normalize(cleaned).replace(/^\/+/, "");
  if (!normalized || normalized === ".") return "";
  if (normalized.startsWith("..") || normalized.includes("/../")) return "";
  return normalized;
}

module.exports = {
  walkFiles,
  guessContentType,
  shouldSkip,
  readLocalBuffer,
  writeLocalBuffer,
  parseJsonBuffer,
  serializeJson,
  normalizeRemotePath,
  extractHtmlTitleAndDescription,
};
