const path = require("path");
const express = require("express");
const packageJson = require("../package.json");
const logger = require("./lib/logger");
const { getAuthConfig, requireAuth } = require("./lib/auth");
const { loadCatalog } = require("./lib/catalog");
const { createStoreManager } = require("./lib/contentStore");
const { guessContentType } = require("./lib/contentTypes");
const { createRuntimeMetrics } = require("./lib/runtimeMetrics");
const { getScreenshotQueueStats } = require("./lib/screenshotQueue");
const { parseBooleanLike } = require("./lib/shared/normalizers");
const { loadSystemState } = require("./lib/systemState");
const { createStateDbStore } = require("./lib/stateDb");
const { createTaskQueue } = require("./lib/taskQueue");
const { createQueryReposFromStore } = require("./ports/queryRepos");
const { errorHandler } = require("./middleware/errorHandler");
const { requestContextMiddleware } = require("./middleware/requestContext");
const { securityHeadersMiddleware } = require("./middleware/securityHeaders");
const { createAuthRouter } = require("./routes/auth");
const { createContentRouter } = require("./routes/contentRoutes");
const { createGroupsRouter } = require("./routes/groups");
const { createCategoriesRouter } = require("./routes/categories");
const { createItemsRouter } = require("./routes/items");
const { createLibraryRouter } = require("./routes/library");
const { createSpaRouter } = require("./routes/spaRoutes");
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
  return parseBooleanLike(value, fallback);
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

function safeAliasedContentKey(reqPath, routePrefix, storagePrefix) {
  const raw = String(reqPath || "");
  if (!raw.startsWith(routePrefix)) return null;
  const suffix = raw.slice(routePrefix.length).replace(/^\/+/, "");
  return safeContentKey(`/content/${storagePrefix}/${suffix}`, storagePrefix);
}

function isHtmlContentKey(key) {
  const value = String(key || "").toLowerCase();
  return value.endsWith(".html") || value.endsWith(".htm");
}

function applyUploadHtmlHeaders(res, { isolated = false } = {}) {
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  if (isolated) {
    res.setHeader("Content-Security-Policy", "sandbox allow-scripts");
  }
}

function shouldServeSpaRoute(reqPath) {
  const p = String(reqPath || "");
  if (!p.startsWith("/")) return false;
  if (p.startsWith("/api/") || p === "/api") return false;
  if (p.startsWith("/assets/") || p === "/assets") return false;
  if (p.startsWith("/content/") || p === "/content") return false;
  return true;
}

function isHardCutLegacySpaPath(reqPath) {
  const p = String(reqPath || "");
  if (p === "/index.html" || p === "/viewer.html") return true;
  if (p === "/app" || p.startsWith("/app/")) return true;
  if (p === "/animations" || p === "/animations.json" || p.startsWith("/animations/")) return true;
  return false;
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
  app.use(
    "/api",
    createCategoriesRouter({
      rootDir,
      authConfig,
      store,
      queryRepos,
    }),
  );
  app.use(
    "/api",
    createItemsRouter({
      rootDir,
      authConfig,
      store,
      taskQueue,
      queryRepos,
    }),
  );
  app.use("/api", createLibraryRouter({ authConfig, store }));

  app.use(
    "/content",
    createContentRouter({
      store,
      guessContentType,
      safeContentKey,
      safeAliasedContentKey,
      isHtmlContentKey,
      applyUploadHtmlHeaders,
    }),
  );

  app.use(
    createSpaRouter({
      rootDir,
      shouldServeSpaRoute,
      isHardCutLegacySpaPath,
    }),
  );

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  app.use(errorHandler);
  return app;
}
module.exports = {
  createApp,
};
