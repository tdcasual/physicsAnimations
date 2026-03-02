const path = require("path");
const fs = require("fs");
const express = require("express");
const packageJson = require("../package.json");
const logger = require("./lib/logger");

const { getAuthConfig, requireAuth } = require("./lib/auth");
const { loadCatalog } = require("./lib/catalog");
const { createStoreManager } = require("./lib/contentStore");
const { createRuntimeMetrics } = require("./lib/runtimeMetrics");
const { getScreenshotQueueStats } = require("./lib/screenshotQueue");
const { loadSystemState } = require("./lib/systemState");
const { createStateDbStore } = require("./lib/stateDb");
const { createTaskQueue } = require("./lib/taskQueue");
const { createQueryReposFromStore } = require("./ports/queryRepos");

const { errorHandler } = require("./middleware/errorHandler");
const { requestContextMiddleware } = require("./middleware/requestContext");
const { securityHeadersMiddleware } = require("./middleware/securityHeaders");
const { createAuthRouter } = require("./routes/auth");
const { createGroupsRouter } = require("./routes/groups");
const { createCategoriesRouter } = require("./routes/categories");
const { createItemsRouter } = require("./routes/items");
const { createLibraryRouter } = require("./routes/library");
const { createSystemRouter } = require("./routes/system");

function parseTrustProxy(value) {
  if (value === undefined) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const normalized = raw.toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (/^\d+$/.test(raw)) return Number.parseInt(raw, 10);
  if (normalized === "loopback" || normalized === "linklocal" || normalized === "uniquelocal") {
    return normalized;
  }
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
    ".ggb": "application/vnd.geogebra.file",
  };
  return map[ext] || "application/octet-stream";
}

function safeContentKey(reqPath, prefix) {
  const raw = String(reqPath || "").replace(/^\/content\//, "");
  const cleaned = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = cleaned.split("/").filter(Boolean);
  for (const part of parts) {
    let decoded = "";
    try {
      decoded = decodeURIComponent(part);
    } catch {
      return null;
    }
    if (decoded === "." || decoded === "..") return null;
    if (decoded.includes("/") || decoded.includes("\\")) return null;
    if (decoded.includes("?") || decoded.includes("#")) return null;
  }
  const normalized = path.posix.normalize(cleaned).replace(/^\/+/, "");
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
  if (p.startsWith("/content/") || p === "/content") return false;
  if (p === "/app" || p.startsWith("/app/")) return false;
  const hasExtensionTail = /\/[^/]+\.[^/]+$/.test(p);
  const dynamicRouteWithDots = p.startsWith("/viewer/") || p.startsWith("/library/folder/");
  if (hasExtensionTail && !dynamicRouteWithDots) return false;
  return true;
}

function createApp({
  rootDir = path.join(__dirname, ".."),
  store: overrideStore,
  authConfig: overrideAuthConfig,
  metricsPublic: overrideMetricsPublic,
  stateDbMode: overrideStateDbMode,
  stateDbPath: overrideStateDbPath,
  stateDbMaxErrors: overrideStateDbMaxErrors,
  taskQueue: overrideTaskQueue,
  queryRepos: overrideQueryRepos,
}) {
  const app = express();
  app.disable("x-powered-by");

  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (trustProxy !== undefined) {
    try {
      app.set("trust proxy", trustProxy);
    } catch (err) {
      app.set("trust proxy", false);
      logger.warn("invalid_trust_proxy_config", {
        value: String(process.env.TRUST_PROXY || ""),
        error: err?.message || "invalid_trust_proxy",
      });
    }
  } else if (process.env.VERCEL) {
    // Vercel runs behind an edge proxy; without this, all requests may share the same IP
    // and rate limiting would become global. Prefer explicit TRUST_PROXY in self-hosted setups.
    app.set("trust proxy", 1);
  }

  const authConfig = overrideAuthConfig || getAuthConfig({ rootDir });
  const parsedMetricsPublic = parseBoolean(overrideMetricsPublic);
  const envMetricsPublic = parseBoolean(process.env.METRICS_PUBLIC);
  const metricsPublic = parsedMetricsPublic ?? envMetricsPublic ?? false;
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
  const resolvedStateDbMode =
    overrideStateDbMode ??
    process.env.STATE_DB_MODE ??
    (overrideStore ? "off" : "sqlite");
  const stateDbWrapped = createStateDbStore({
    rootDir,
    store: storeBase,
    mode: resolvedStateDbMode,
    dbPath: overrideStateDbPath,
    maxErrors: overrideStateDbMaxErrors,
  });
  const store = stateDbWrapped.store;
  const queryRepos = overrideQueryRepos || createQueryReposFromStore({ store });
  const runtimeMetrics = createRuntimeMetrics();

  app.use(requestContextMiddleware);
  app.use(securityHeadersMiddleware);
  app.use(runtimeMetrics.middleware);
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
      app: {
        name: packageJson.name,
        version: packageJson.version,
      },
      process: {
        pid: process.pid,
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      uptimeSec: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      screenshotQueue: getScreenshotQueueStats(),
      taskQueue: taskQueue.getStats(),
      stateDb: stateDbWrapped.info,
      http: runtimeMetrics.snapshot(),
    });
  };
  if (metricsPublic) app.get("/api/metrics", metricsHandler);
  else app.get("/api/metrics", authRequired, metricsHandler);

  app.get("/api/catalog", async (_req, res, next) => {
    try {
      const catalog = await loadCatalog({
        rootDir,
        store,
        taxonomyQueryRepo: queryRepos.taxonomyQueryRepo,
      });
      res.json(catalog);
    } catch (err) {
      if (err?.message === "state_db_unavailable") {
        res.status(503).json({ error: "state_db_unavailable" });
        return;
      }
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
  app.use("/api", createCategoriesRouter({ rootDir, authConfig, store, queryRepos }));
  app.use("/api", createItemsRouter({ rootDir, authConfig, store, taskQueue, queryRepos }));
  app.use("/api", createLibraryRouter({ authConfig, store }));

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

  app.get(/^\/content\/library\/.*/, async (req, res, next) => {
    try {
      const key = safeContentKey(req.path, "library");
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
