const fs = require("fs");
const path = require("path");

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
  };
  return map[ext] || "application/octet-stream";
}

function shouldSkip(relPath) {
  const normalized = relPath.split(path.sep).join("/");
  const baseName = path.basename(normalized);
  if (SKIP_FILES.has(baseName)) return true;
  if (baseName.startsWith(".") && baseName !== ".well-known") return true;
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
  const cleaned = String(value || "").replace(/^\/+/, "");
  const normalized = path.posix.normalize(cleaned).replace(/^\/+/, "");
  if (!normalized || normalized === ".") return "";
  if (normalized.startsWith("..") || normalized.includes("/../")) return "";
  return normalized;
}

function extractHtmlTitleAndDescription(html) {
  const text = String(html || "");
  const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch ? String(titleMatch[1] || "").trim() : "";

  const descMatch =
    text.match(/<meta[^>]+name=[\"']description[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>/i) ||
    text.match(/<meta[^>]+content=[\"']([^\"']*)[\"'][^>]*name=[\"']description[\"'][^>]*>/i);
  const rawDesc = descMatch ? String(descMatch[1] || "").trim() : "";

  return { title: rawTitle, description: rawDesc };
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
