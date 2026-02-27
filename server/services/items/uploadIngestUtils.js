const path = require("path");

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

module.exports = {
  guessContentType,
  isZipUpload,
  normalizeZipPath,
};
