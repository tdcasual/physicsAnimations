const path = require("path");

const { createLocalStore } = require("./contentStore/localStore");
const { createWebdavStore } = require("./contentStore/webdavStore");

function normalizeMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  if (mode === "webdav") return "webdav";
  if (mode === "local") return "local";
  return "";
}

function resolveWebdavConfig(config) {
  return {
    url: config?.storage?.webdav?.url ?? process.env.WEBDAV_URL ?? "",
    basePath:
      config?.storage?.webdav?.basePath ?? process.env.WEBDAV_BASE_PATH ?? "physicsAnimations",
    username: config?.storage?.webdav?.username ?? process.env.WEBDAV_USERNAME ?? "",
    password: config?.storage?.webdav?.password ?? process.env.WEBDAV_PASSWORD ?? "",
    timeoutMs: config?.storage?.webdav?.timeoutMs ?? process.env.WEBDAV_TIMEOUT_MS ?? "15000",
  };
}

function createContentStore({ rootDir, config } = {}) {
  const rawMode = config?.storage?.mode ?? process.env.STORAGE_MODE ?? "";
  const hasModeInput = typeof rawMode === "string" && rawMode.trim() !== "";
  const mode = normalizeMode(rawMode);
  const webdavConfig = resolveWebdavConfig(config);
  const effectiveMode = mode || "local";

  if (hasModeInput && !mode) {
    throw new Error("invalid_storage_mode");
  }

  if (effectiveMode === "webdav") {
    if (!String(webdavConfig.url || "").trim()) {
      throw new Error("webdav_missing_url");
    }
    return createWebdavStore(webdavConfig);
  }

  return createLocalStore({ rootDir: rootDir || process.cwd() });
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
