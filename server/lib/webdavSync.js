const fs = require("fs");
const path = require("path");

const { createWebdavStore } = require("./contentStore");

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

async function syncLocalToWebdav({ rootDir, webdavConfig }) {
  const contentDir = path.join(rootDir, "content");
  const store = createWebdavStore(webdavConfig);

  const files = walkFiles(contentDir);
  let uploaded = 0;
  let skipped = 0;

  for (const filePath of files) {
    const rel = path.relative(contentDir, filePath).split(path.sep).join("/");
    if (!rel || shouldSkip(rel)) {
      skipped += 1;
      continue;
    }
    const buf = fs.readFileSync(filePath);
    const contentType = guessContentType(filePath);
    await store.writeBuffer(rel, buf, { contentType });
    uploaded += 1;
  }

  return { uploaded, skipped };
}

module.exports = {
  syncLocalToWebdav,
};
