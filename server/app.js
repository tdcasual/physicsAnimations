const path = require("path");
const express = require("express");

const { getAuthConfig } = require("./lib/auth");
const { loadCatalog } = require("./lib/catalog");
const { createContentStore } = require("./lib/contentStore");
const { UPLOAD_CSP } = require("./lib/uploadSecurity");

const { errorHandler } = require("./middleware/errorHandler");
const { createAuthRouter } = require("./routes/auth");
const { createCategoriesRouter } = require("./routes/categories");
const { createItemsRouter } = require("./routes/items");

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

function safeContentKey(reqPath, prefix) {
  const raw = String(reqPath || "").replace(/^\/content\//, "");
  const normalized = path.posix.normalize(raw).replace(/^\/+/, "");
  if (!normalized || normalized === ".") return null;
  if (normalized.startsWith("..") || normalized.includes("/../")) return null;
  if (!normalized.startsWith(`${prefix}/`)) return null;
  return normalized;
}

function createApp({ rootDir, store: overrideStore, authConfig: overrideAuthConfig }) {
  const app = express();
  app.disable("x-powered-by");

  const authConfig = overrideAuthConfig || getAuthConfig({ rootDir });
  const store = overrideStore || createContentStore({ rootDir });

  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/catalog", async (_req, res, next) => {
    try {
      const catalog = await loadCatalog({ rootDir, store });
      res.json(catalog);
    } catch (err) {
      next(err);
    }
  });

  app.use("/api", createAuthRouter({ authConfig }));
  app.use("/api", createCategoriesRouter({ rootDir, authConfig, store }));
  app.use("/api", createItemsRouter({ rootDir, authConfig, store }));

  app.use("/assets", express.static(path.join(rootDir, "assets")));
  app.use("/animations", express.static(path.join(rootDir, "animations")));
  if (store.mode === "local") {
    app.use(
      "/content/uploads",
      express.static(path.join(rootDir, "content", "uploads"), {
        setHeaders(res, filePath) {
          const lower = filePath.toLowerCase();
          if (!lower.endsWith(".html") && !lower.endsWith(".htm")) return;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Content-Security-Policy", `${UPLOAD_CSP}; frame-ancestors 'self'`);
          res.setHeader("Referrer-Policy", "no-referrer");
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("Cache-Control", "no-store");
        },
      }),
    );
    app.use("/content/thumbnails", express.static(path.join(rootDir, "content", "thumbnails")));
  } else {
    app.get("/content/uploads/*", async (req, res, next) => {
      try {
        const key = safeContentKey(req.path, "uploads");
        if (!key) {
          res.status(400).json({ error: "invalid_path" });
          return;
        }
        const stream = await store.createReadStream(key);
        if (!stream) {
          res.status(404).send("Not Found");
          return;
        }

        res.setHeader("Content-Type", guessContentType(key));

        if (key.toLowerCase().endsWith(".html") || key.toLowerCase().endsWith(".htm")) {
          res.setHeader("Content-Security-Policy", `${UPLOAD_CSP}; frame-ancestors 'self'`);
          res.setHeader("Referrer-Policy", "no-referrer");
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("Cache-Control", "no-store");
        }

        stream.on("error", next);
        stream.pipe(res);
      } catch (err) {
        next(err);
      }
    });

    app.get("/content/thumbnails/*", async (req, res, next) => {
      try {
        const key = safeContentKey(req.path, "thumbnails");
        if (!key) {
          res.status(400).json({ error: "invalid_path" });
          return;
        }
        const stream = await store.createReadStream(key);
        if (!stream) {
          res.status(404).send("Not Found");
          return;
        }
        res.setHeader("Content-Type", guessContentType(key));
        stream.on("error", next);
        stream.pipe(res);
      } catch (err) {
        next(err);
      }
    });
  }

  app.get("/animations.json", (_req, res) => {
    res.sendFile(path.join(rootDir, "animations.json"));
  });

  app.get("/", (_req, res) => {
    res.sendFile(path.join(rootDir, "index.html"));
  });
  app.get("/index.html", (_req, res) => {
    res.sendFile(path.join(rootDir, "index.html"));
  });
  app.get("/viewer.html", (_req, res) => {
    res.sendFile(path.join(rootDir, "viewer.html"));
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
