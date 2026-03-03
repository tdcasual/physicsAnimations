const path = require("path");

const CONTENT_TYPES = {
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
  ".ggb": "application/vnd.geogebra.file",
};

function guessContentType(filePath) {
  const ext = path.extname(String(filePath || "")).toLowerCase();
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

module.exports = {
  guessContentType,
};
