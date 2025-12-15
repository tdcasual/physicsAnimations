const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

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

function createLocalStore({ rootDir }) {
  const baseDir = path.join(rootDir, "content");
  fs.mkdirSync(baseDir, { recursive: true });

  function resolveKey(key) {
    const cleaned = String(key || "").replace(/^\/+/, "");
    return path.join(baseDir, cleaned);
  }

  return {
    mode: "local",
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

function createWebdavStore() {
  const rawUrl = process.env.WEBDAV_URL || "";
  if (!rawUrl) {
    throw new Error("WEBDAV_URL is required when STORAGE_MODE=webdav");
  }

  const timeoutMs = Number.parseInt(process.env.WEBDAV_TIMEOUT_MS || "15000", 10);
  const basePath = process.env.WEBDAV_BASE_PATH || "physicsAnimations";

  const username = process.env.WEBDAV_USERNAME || "";
  const password = process.env.WEBDAV_PASSWORD || "";
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
    baseUrl,
    basePath,

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

function createContentStore({ rootDir }) {
  const mode = String(process.env.STORAGE_MODE || "").toLowerCase();
  const useWebdav = mode === "webdav" || Boolean(process.env.WEBDAV_URL);
  if (useWebdav) return createWebdavStore();
  return createLocalStore({ rootDir });
}

module.exports = {
  createContentStore,
};
