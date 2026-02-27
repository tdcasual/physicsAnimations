const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const { createError } = require("./errors");
const logger = require("./logger");

function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

function joinUrlPath(...parts) {
  const joined = parts
    .flatMap((p) => String(p || "").split("/"))
    .filter(Boolean)
    .join("/");
  return joined;
}

function createBasicAuthHeader(username, password) {
  const token = Buffer.from(`${username}:${password}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function canWriteDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch {
    return false;
  }

  const fileName = `.pa-write-test-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const filePath = path.join(dirPath, fileName);
  try {
    fs.writeFileSync(filePath, "1", "utf8");
    fs.unlinkSync(filePath);
    return true;
  } catch {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
    return false;
  }
}

function createReadOnlyLocalStore({ rootDir, reason = "" } = {}) {
  const baseDir = path.join(rootDir || process.cwd(), "content");

  function resolveKey(key) {
    const cleaned = String(key || "").replace(/^\/+/, "");
    return path.join(baseDir, cleaned);
  }

  function throwReadOnly() {
    throw createError("storage_readonly", 503, {
      reason: reason || "content_dir_not_writable",
      baseDir,
      hint: "Set STORAGE_MODE=webdav and configure WEBDAV_URL (+ optional WEBDAV_USERNAME/WEBDAV_PASSWORD).",
    });
  }

  return {
    mode: "local_readonly",
    readOnly: true,
    baseDir,

    async readBuffer(key) {
      const filePath = resolveKey(key);
      if (!fs.existsSync(filePath)) return null;
      return fs.promises.readFile(filePath);
    },

    async writeBuffer() {
      throwReadOnly();
    },

    async deletePath() {
      throwReadOnly();
    },

    async createReadStream(key) {
      const filePath = resolveKey(key);
      if (!fs.existsSync(filePath)) return null;
      return fs.createReadStream(filePath);
    },
  };
}

function createLocalStore({ rootDir }) {
  const baseDir = path.join(rootDir, "content");
  fs.mkdirSync(baseDir, { recursive: true });

  function resolveKey(key) {
    const cleaned = String(key || "").replace(/^\/+/, "");
    return path.join(baseDir, cleaned);
  }

  return {
    mode: "local",
    readOnly: false,
    baseDir,

    async readBuffer(key) {
      const filePath = resolveKey(key);
      if (!fs.existsSync(filePath)) return null;
      return fs.promises.readFile(filePath);
    },

    async writeBuffer(key, buffer) {
      const filePath = resolveKey(key);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const tmpPath = `${filePath}.tmp`;
      await fs.promises.writeFile(tmpPath, buffer);
      await fs.promises.rename(tmpPath, filePath);
    },

    async deletePath(key, { recursive = false } = {}) {
      const targetPath = resolveKey(key);
      if (!fs.existsSync(targetPath)) return;
      await fs.promises.rm(targetPath, { recursive, force: true });
    },

    async createReadStream(key) {
      const filePath = resolveKey(key);
      if (!fs.existsSync(filePath)) return null;
      return fs.createReadStream(filePath);
    },
  };
}

function createWebdavStore(options = {}) {
  const rawUrl = options.url || process.env.WEBDAV_URL || "";
  if (!rawUrl) {
    throw new Error("WEBDAV_URL is required when STORAGE_MODE=webdav");
  }

  const timeoutMs = Number.parseInt(
    options.timeoutMs || process.env.WEBDAV_TIMEOUT_MS || "15000",
    10,
  );
  const basePath = options.basePath || process.env.WEBDAV_BASE_PATH || "physicsAnimations";

  const username = options.username || process.env.WEBDAV_USERNAME || "";
  const password = options.password || process.env.WEBDAV_PASSWORD || "";
  const authHeader =
    username && password ? createBasicAuthHeader(username, password) : "";

  const baseUrl = ensureTrailingSlash(rawUrl);
  const basePathSegments = String(basePath || "")
    .split("/")
    .filter(Boolean);

  function urlForKey(key, { isDir = false } = {}) {
    const rel = joinUrlPath(basePath, key);
    const url = new URL(rel, baseUrl);
    if (isDir && !url.pathname.endsWith("/")) url.pathname += "/";
    return url.toString();
  }

  async function webdavRequest(method, url, { headers = {}, body } = {}) {
    const requestHeaders = { ...(authHeader ? { Authorization: authHeader } : {}), ...headers };
    const response = await fetchWithTimeout(url, { method, headers: requestHeaders, body }, timeoutMs);
    return response;
  }

  function decodeXmlText(value) {
    return String(value || "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  function extractPropfindHrefs(xml) {
    const out = [];
    const re = /<(?:[a-zA-Z0-9]+:)?href>([^<]+)<\/(?:[a-zA-Z0-9]+:)?href>/g;
    const text = String(xml || "");
    let match = null;
    while ((match = re.exec(text))) {
      const raw = decodeXmlText(match[1] || "").trim();
      if (raw) out.push(raw);
    }
    return out;
  }

  async function ensureRemoteDir(dirKey) {
    let baseCurrent = "";
    for (const segment of basePathSegments) {
      baseCurrent = baseCurrent ? `${baseCurrent}/${segment}` : segment;
      const dirUrl = new URL(`${baseCurrent}/`, baseUrl).toString();
      const res = await webdavRequest("MKCOL", dirUrl);
      if (res.status === 201 || res.status === 200 || res.status === 204) continue;
      if (res.status === 405) continue;
      if (res.status === 409) throw new Error("webdav_parent_missing");
      throw new Error(`webdav_mkcol_failed_${res.status}`);
    }

    const segments = String(dirKey || "")
      .split("/")
      .filter(Boolean);

    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      const url = urlForKey(current, { isDir: true });
      const res = await webdavRequest("MKCOL", url);
      if (res.status === 201 || res.status === 200 || res.status === 204) continue;
      if (res.status === 405) continue;
      if (res.status === 409) {
        throw new Error("webdav_parent_missing");
      }
      throw new Error(`webdav_mkcol_failed_${res.status}`);
    }
  }

  return {
    mode: "webdav",
    readOnly: false,
    baseUrl,
    basePath,

    async listDir(dirKey, { depth = 1 } = {}) {
      const dirUrl = urlForKey(dirKey, { isDir: true });
      const body = `<?xml version="1.0" encoding="utf-8"?>\n<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`;
      const headers = {
        Depth: String(depth),
        "Content-Type": "application/xml; charset=utf-8",
      };

      const res = await webdavRequest("PROPFIND", dirUrl, { headers, body });
      if (res.status === 404) return [];
      if (!(res.status === 207 || res.ok)) {
        throw new Error(`webdav_propfind_failed_${res.status}`);
      }

      const xml = await res.text();
      const basePathname = new URL(dirUrl).pathname;
      const hrefs = extractPropfindHrefs(xml);

      const entries = [];
      for (const href of hrefs) {
        let url = null;
        try {
          url = new URL(href, baseUrl);
        } catch {
          continue;
        }

        const pathname = url.pathname;
        if (!pathname.startsWith(basePathname)) continue;

        let rel = pathname.slice(basePathname.length);
        if (!rel) continue;
        const isDir = rel.endsWith("/");
        rel = rel.replace(/\/+$/, "");
        if (!rel) continue;
        if (rel.includes("/")) continue;

        entries.push({
          key: joinUrlPath(dirKey, rel),
          name: rel,
          isDir,
        });
      }

      return entries;
    },

    async readBuffer(key) {
      const url = urlForKey(key);
      const res = await webdavRequest("GET", url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`webdav_get_failed_${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    },

    async writeBuffer(key, buffer, { contentType = "" } = {}) {
      const dir = String(key || "").split("/").slice(0, -1).join("/");
      await ensureRemoteDir(dir);

      const url = urlForKey(key);
      const headers = {};
      if (contentType) headers["Content-Type"] = contentType;
      const res = await webdavRequest("PUT", url, { headers, body: buffer });
      if (!res.ok) throw new Error(`webdav_put_failed_${res.status}`);
    },

    async deletePath(key, { recursive = false } = {}) {
      const url = urlForKey(key, { isDir: recursive });
      const res = await webdavRequest("DELETE", url);
      if (res.status === 404) return;
      if (!res.ok) throw new Error(`webdav_delete_failed_${res.status}`);
    },

    async createReadStream(key) {
      const url = urlForKey(key);
      const res = await webdavRequest("GET", url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`webdav_get_failed_${res.status}`);
      if (!res.body) return null;
      return Readable.fromWeb(res.body);
    },
  };
}

function createHybridStore({ rootDir, webdavConfig }) {
  const local = createLocalStore({ rootDir });
  const webdav = createWebdavStore(webdavConfig);

  async function mirror(op, label) {
    try {
      await op();
    } catch (err) {
      logger.warn("webdav_mirror_failed", {
        operation: label,
        error: err,
      });
    }
  }

  return {
    mode: "hybrid",
    readOnly: false,
    baseDir: local.baseDir,
    baseUrl: webdav.baseUrl,
    basePath: webdav.basePath,
    webdav,
    local,

    async readBuffer(key) {
      const localBuf = await local.readBuffer(key);
      if (localBuf) return localBuf;
      const remoteBuf = await webdav.readBuffer(key);
      if (remoteBuf) {
        await mirror(() => local.writeBuffer(key, remoteBuf), `cache ${key}`);
      }
      return remoteBuf;
    },

    async writeBuffer(key, buffer, options) {
      await local.writeBuffer(key, buffer, options);
      await mirror(() => webdav.writeBuffer(key, buffer, options), `write ${key}`);
    },

    async deletePath(key, options) {
      await local.deletePath(key, options);
      await mirror(() => webdav.deletePath(key, options), `delete ${key}`);
    },

    async createReadStream(key) {
      const localStream = await local.createReadStream(key);
      if (localStream) return localStream;
      return webdav.createReadStream(key);
    },
  };
}

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
  createWebdavStore,
  createStoreManager,
};
