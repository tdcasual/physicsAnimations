const path = require("path");
const fs = require("fs");
const express = require("express");

const { getAuthConfig, requireAuth } = require("./lib/auth");
const { loadCatalog } = require("./lib/catalog");
const { createStoreManager } = require("./lib/contentStore");
const { getScreenshotQueueStats } = require("./lib/screenshotQueue");
const { loadSystemState } = require("./lib/systemState");
const { createStateDbStore } = require("./lib/stateDb");
const { createTaskQueue } = require("./lib/taskQueue");

const { errorHandler } = require("./middleware/errorHandler");
const { createAuthRouter } = require("./routes/auth");
const { createGroupsRouter } = require("./routes/groups");
const { createCategoriesRouter } = require("./routes/categories");
const { createItemsRouter } = require("./routes/items");
const { createSystemRouter } = require("./routes/system");

function parseTrustProxy(value) {
  if (value === undefined) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  if (raw === "true") return true;
  if (raw === "false") return false;
  const n = Number.parseInt(raw, 10);
  if (Number.isFinite(n) && String(n) === raw) return n;
  return raw;
}

function parseBoolean(value, fallback = undefined) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") return true;
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return false;
  return fallback;
}

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

function shouldServeSpaRoute(reqPath) {
  const p = String(reqPath || "");
  if (!p.startsWith("/")) return false;
  if (p.startsWith("/api/") || p === "/api") return false;
  if (p.startsWith("/assets/") || p === "/assets") return false;
  if (p.startsWith("/animations/") || p === "/animations") return false;
  if (p.startsWith("/content/") || p === "/content") return false;
  if (p === "/animations.json") return false;
  if (p === "/index.html" || p === "/viewer.html") return false;
  if (p === "/app" || p.startsWith("/app/")) return false;
  if (/^\/[^/]+\.[^/]+$/.test(p)) return false;
  return true;
}

function createApp({
  rootDir,
  store: overrideStore,
  authConfig: overrideAuthConfig,
  metricsPublic: overrideMetricsPublic,
  stateDbMode: overrideStateDbMode,
  stateDbPath: overrideStateDbPath,
  stateDbMaxErrors: overrideStateDbMaxErrors,
  taskQueue: overrideTaskQueue,
}) {
  const app = express();
  app.disable("x-powered-by");

  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (trustProxy !== undefined) {
    app.set("trust proxy", trustProxy);
  } else if (process.env.VERCEL) {
    // Vercel runs behind an edge proxy; without this, all requests may share the same IP
    // and rate limiting would become global. Prefer explicit TRUST_PROXY in self-hosted setups.
    app.set("trust proxy", 1);
  }

  const authConfig = overrideAuthConfig || getAuthConfig({ rootDir });
  const parsedMetricsPublic = parseBoolean(overrideMetricsPublic);
  const envMetricsPublic = parseBoolean(process.env.METRICS_PUBLIC);
  const metricsPublic = parsedMetricsPublic ?? envMetricsPublic ?? true;
  const authRequired = requireAuth({ authConfig });
  const taskQueue =
    overrideTaskQueue ||
    createTaskQueue({
      stateFile: path.join(rootDir, "content", "tasks.json"),
    });
  const systemState = loadSystemState({ rootDir });
  const storeManager = overrideStore
    ? { store: overrideStore, setConfig: () => {} }
    : createStoreManager({ rootDir, config: systemState });
  const storeBase = storeManager.store;
  const stateDbWrapped = createStateDbStore({
    rootDir,
    store: storeBase,
    mode: overrideStateDbMode,
    dbPath: overrideStateDbPath,
    maxErrors: overrideStateDbMaxErrors,
  });
  const store = stateDbWrapped.store;

  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      uptimeSec: Math.floor(process.uptime()),
      screenshotQueue: getScreenshotQueueStats(),
    });
  });

  const metricsHandler = (_req, res) => {
    res.json({
      uptimeSec: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      screenshotQueue: getScreenshotQueueStats(),
      taskQueue: taskQueue.getStats(),
      stateDb: stateDbWrapped.info,
    });
  };
  if (metricsPublic) app.get("/api/metrics", metricsHandler);
  else app.get("/api/metrics", authRequired, metricsHandler);

  app.get("/api/catalog", async (_req, res, next) => {
    try {
      const catalog = await loadCatalog({ rootDir, store });
      res.json(catalog);
    } catch (err) {
      next(err);
    }
  });

  app.use("/api", createAuthRouter({ authConfig, store }));
  app.use(
    "/api",
    createSystemRouter({
      authConfig,
      store,
      taskQueue,
      rootDir,
      updateStoreConfig: storeManager.setConfig,
    }),
  );
  app.use("/api", createGroupsRouter({ rootDir, authConfig, store }));
  app.use("/api", createCategoriesRouter({ rootDir, authConfig, store }));
  app.use("/api", createItemsRouter({ rootDir, authConfig, store, taskQueue }));

  const spaDistDir = path.join(rootDir, "frontend", "dist");
  const spaAssetsDir = path.join(spaDistDir, "assets");
  const spaIndexPath = path.join(spaDistDir, "index.html");

  app.use("/assets", express.static(spaAssetsDir));

  function sendSpaEntry(_req, res) {
    if (!fs.existsSync(spaIndexPath)) {
      res.status(503).json({ error: "service_unavailable" });
      return;
    }
    res.sendFile("index.html", { root: spaDistDir });
  }

  app.use("/animations", express.static(path.join(rootDir, "animations")));
  app.get(/^\/content\/uploads\/.*/, async (req, res, next) => {
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

  app.get(/^\/content\/thumbnails\/.*/, async (req, res, next) => {
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

  app.get("/animations.json", (_req, res) => {
    res.sendFile("animations.json", { root: rootDir });
  });

  app.get(/^\/.*/, (req, res, next) => {
    if (shouldServeSpaRoute(req.path)) {
      sendSpaEntry(req, res);
      return;
    }
    next();
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
