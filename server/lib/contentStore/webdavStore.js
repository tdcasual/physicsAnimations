const { Readable } = require("stream");
const { createError } = require("../errors");

const {
  createBasicAuthHeader,
  ensureTrailingSlash,
  fetchWithTimeout,
  joinUrlPath,
} = require("./utils");

function normalizeTimeoutMs(rawValue, fallback = 15000) {
  let parsed = Number.NaN;
  if (typeof rawValue === "number") {
    parsed = Number.isFinite(rawValue) ? Math.trunc(rawValue) : Number.NaN;
  } else {
    const raw = String(rawValue ?? "").trim();
    if (!raw || !/^\d+$/.test(raw)) return fallback;
    parsed = Number.parseInt(raw, 10);
  }
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1000, parsed);
}

function normalizeBasePath(rawValue, fallback = "physicsAnimations") {
  const raw = String(rawValue || "").trim();
  const source = raw || fallback;
  const parts = source
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);
  if (!parts.length) return "";
  for (const part of parts) {
    if (part === "." || part === "..") {
      throw new Error("invalid_webdav_base_path");
    }
  }
  return parts.join("/");
}

function isLiteralBlockedIp(hostname) {
  if (!hostname) return true;
  if (hostname === "localhost" || hostname.endsWith(".local")) return true;
  const parts = hostname.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const [a, b] = parts.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
  }
  return false;
}

function createWebdavStore(options = {}) {
  const rawUrl = options.url ?? process.env.WEBDAV_URL ?? "";
  if (!rawUrl) {
    throw new Error("WEBDAV_URL is required when STORAGE_MODE=webdav");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("invalid_webdav_url");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("invalid_webdav_url_protocol");
  }
  if (process.env.NODE_ENV === "production" && isLiteralBlockedIp(parsedUrl.hostname)) {
    throw new Error("blocked_webdav_url");
  }

  const timeoutMs = normalizeTimeoutMs(options.timeoutMs ?? process.env.WEBDAV_TIMEOUT_MS, 15000);
  const basePath = normalizeBasePath(options.basePath ?? process.env.WEBDAV_BASE_PATH, "physicsAnimations");

  const username = options.username ?? process.env.WEBDAV_USERNAME ?? "";
  const password = options.password ?? process.env.WEBDAV_PASSWORD ?? "";
  const authHeader =
    String(username).length > 0 || String(password).length > 0
      ? createBasicAuthHeader(username, password)
      : "";

  const baseUrl = ensureTrailingSlash(rawUrl);
  const basePathSegments = String(basePath || "")
    .split("/")
    .filter(Boolean);

  function normalizeStorageKey(key, { allowEmpty = false } = {}) {
    const raw = String(key || "");
    const cleaned = raw.replace(/\\/g, "/").replace(/^\/+/, "");
    const normalized = cleaned ? cleaned.split("/").filter(Boolean).join("/") : "";
    if (!normalized) {
      if (allowEmpty) return "";
      throw createError("invalid_storage_key", 400, { key: raw });
    }
    const parts = normalized.split("/");
    for (const part of parts) {
      if (!part) {
        throw createError("invalid_storage_key", 400, { key: raw });
      }
      let decoded = "";
      try {
        decoded = decodeURIComponent(part);
      } catch {
        throw createError("invalid_storage_key", 400, { key: raw });
      }
      if (
        part === "." ||
        part === ".." ||
        decoded === "." ||
        decoded === ".." ||
        part.includes("?") ||
        part.includes("#") ||
        decoded.includes("?") ||
        decoded.includes("#") ||
        decoded.includes("/") ||
        decoded.includes("\\")
      ) {
        throw createError("invalid_storage_key", 400, { key: raw });
      }
    }
    return parts.join("/");
  }

  function urlForKey(key, { isDir = false, allowEmpty = false } = {}) {
    const safeKey = normalizeStorageKey(key, { allowEmpty });
    const rel = joinUrlPath(basePath, safeKey);
    const url = new URL(rel, baseUrl);
    if (isDir && !url.pathname.endsWith("/")) url.pathname += "/";
    return url.toString();
  }

  async function webdavRequest(method, url, { headers = {}, body } = {}) {
    const requestHeaders = { ...(authHeader ? { Authorization: authHeader } : {}), ...headers };
    return fetchWithTimeout(url, { method, headers: requestHeaders, body }, timeoutMs);
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
      .replace(/\\/g, "/")
      .split("/")
      .filter(Boolean);

    for (const segment of segments) {
      if (segment === "." || segment === "..") {
        throw createError("invalid_storage_key", 400, { key: dirKey });
      }
    }

    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      const url = urlForKey(current, { isDir: true });
      const res = await webdavRequest("MKCOL", url);
      if (res.status === 201 || res.status === 200 || res.status === 204) continue;
      if (res.status === 405) continue;
      if (res.status === 409) throw new Error("webdav_parent_missing");
      throw new Error(`webdav_mkcol_failed_${res.status}`);
    }
  }

  return {
    mode: "webdav",
    readOnly: false,
    baseUrl,
    basePath,

    async listDir(dirKey, { depth = 1 } = {}) {
      const dirUrl = urlForKey(dirKey, { isDir: true, allowEmpty: true });
      const body =
        '<?xml version="1.0" encoding="utf-8"?>\n<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>';
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

module.exports = {
  createWebdavStore,
};
