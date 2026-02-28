const path = require("path");

const logger = require("./logger");
const { createHybridStore } = require("./contentStore/hybridStore");
const { createLocalStore, createReadOnlyLocalStore } = require("./contentStore/localStore");
const { canWriteDir } = require("./contentStore/utils");
const { createWebdavStore } = require("./contentStore/webdavStore");

function normalizeMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  if (mode === "webdav") return "webdav";
  if (mode === "hybrid") return "hybrid";
  if (mode === "local+webdav") return "hybrid";
  if (mode === "mirror") return "hybrid";
  if (mode === "local") return "local";
  return "";
}

function resolveWebdavConfig(config) {
  return {
    url: config?.storage?.webdav?.url || process.env.WEBDAV_URL || "",
    basePath:
      config?.storage?.webdav?.basePath || process.env.WEBDAV_BASE_PATH || "physicsAnimations",
    username: config?.storage?.webdav?.username || process.env.WEBDAV_USERNAME || "",
    password: config?.storage?.webdav?.password || process.env.WEBDAV_PASSWORD || "",
    timeoutMs: config?.storage?.webdav?.timeoutMs || process.env.WEBDAV_TIMEOUT_MS || "15000",
  };
}

function createContentStore({ rootDir, config } = {}) {
  const rawMode = config?.storage?.mode || process.env.STORAGE_MODE || "";
  const mode = normalizeMode(rawMode);
  const webdavConfig = resolveWebdavConfig(config);
  const hasWebdav = Boolean(webdavConfig.url);
  const effectiveMode = mode || (hasWebdav ? "hybrid" : "local");

  if (effectiveMode === "webdav" && hasWebdav) {
    return createWebdavStore(webdavConfig);
  }

  const baseDir = path.join(rootDir || process.cwd(), "content");
  const localWritable = canWriteDir(baseDir);

  if (effectiveMode === "hybrid") {
    if (!hasWebdav) {
      logger.warn("storage_hybrid_missing_webdav_url", {
        fallback: "local",
      });
      if (localWritable) return createLocalStore({ rootDir });
      logger.warn("storage_local_not_writable", {
        fallback: "local_readonly",
      });
      return createReadOnlyLocalStore({ rootDir, reason: "content_dir_not_writable" });
    }

    if (localWritable) return createHybridStore({ rootDir, webdavConfig });

    logger.warn("storage_local_not_writable", {
      fallback: "webdav",
    });
    return createWebdavStore(webdavConfig);
  }

  if (localWritable) return createLocalStore({ rootDir });

  logger.warn("storage_local_not_writable", {
    fallback: "local_readonly",
  });
  return createReadOnlyLocalStore({ rootDir, reason: "content_dir_not_writable" });
}

function createStoreManager({ rootDir, config } = {}) {
  let currentConfig = config || {};
  let currentStore = createContentStore({ rootDir, config: currentConfig });

  function getStore() {
    return currentStore;
  }

  const proxy = {
    get mode() {
      return getStore().mode;
    },
    get readOnly() {
      return Boolean(getStore().readOnly);
    },
    get baseDir() {
      return getStore().baseDir;
    },
    get baseUrl() {
      return getStore().baseUrl;
    },
    get basePath() {
      return getStore().basePath;
    },
    get local() {
      return getStore().local;
    },
    get webdav() {
      return getStore().webdav;
    },
    async readBuffer(key) {
      return getStore().readBuffer(key);
    },
    async writeBuffer(key, buffer, options) {
      return getStore().writeBuffer(key, buffer, options);
    },
    async deletePath(key, options) {
      return getStore().deletePath(key, options);
    },
    async createReadStream(key) {
      return getStore().createReadStream(key);
    },
  };

  function setConfig(nextConfig) {
    currentConfig = nextConfig || {};
    currentStore = createContentStore({ rootDir, config: currentConfig });
    return currentStore;
  }

  function getConfig() {
    return currentConfig;
  }

  return { store: proxy, setConfig, getConfig };
}

module.exports = {
  createContentStore,
  createStoreManager,
  createWebdavStore,
};
