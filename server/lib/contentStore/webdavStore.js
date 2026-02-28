const { Readable } = require("stream");

const {
  createBasicAuthHeader,
  ensureTrailingSlash,
  fetchWithTimeout,
  joinUrlPath,
} = require("./utils");

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
  const authHeader = username && password ? createBasicAuthHeader(username, password) : "";

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
      .split("/")
      .filter(Boolean);

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
      const dirUrl = urlForKey(dirKey, { isDir: true });
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
