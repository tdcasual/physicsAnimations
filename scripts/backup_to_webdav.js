const fs = require("fs");
const path = require("path");

const { createContentStore } = require("../server/lib/contentStore");

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
  };
  return map[ext] || "application/octet-stream";
}

async function main() {
  const rootDir = path.join(__dirname, "..");
  const store = createContentStore({ rootDir });

  if (store.mode !== "webdav") {
    console.error("[backup_to_webdav] WebDAV is not configured.");
    console.error("[backup_to_webdav] Set WEBDAV_URL (+ optional WEBDAV_BASE_PATH/WEBDAV_USERNAME/WEBDAV_PASSWORD).");
    process.exit(1);
  }

  const contentDir = path.join(rootDir, "content");
  const files = walkFiles(contentDir);
  if (!files.length) {
    console.log("[backup_to_webdav] Nothing to backup (content/ is empty).");
    return;
  }

  for (const filePath of files) {
    const key = path.relative(contentDir, filePath).split(path.sep).join("/");
    const buf = fs.readFileSync(filePath);
    const contentType = guessContentType(filePath);
    await store.writeBuffer(key, buf, { contentType });
    console.log(`[backup_to_webdav] Uploaded ${key}`);
  }

  console.log("[backup_to_webdav] Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

