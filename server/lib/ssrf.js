const dns = require("dns").promises;
const net = require("net");

const ipaddr = require("ipaddr.js");

function isBlockedIp(ip) {
  try {
    const addr = ipaddr.parse(ip);
    if (addr.kind() === "ipv6" && addr.isIPv4MappedAddress()) {
      return isBlockedIp(addr.toIPv4Address().toString());
    }
    const range = addr.range();
    return [
      "unspecified",
      "broadcast",
      "multicast",
      "linkLocal",
      "loopback",
      "private",
      "uniqueLocal",
      "carrierGradeNat",
    ].includes(range);
  } catch {
    return true;
  }
}

async function hostnameResolvesToPublicIp(hostname, cache) {
  const key = hostname.toLowerCase();
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.ok;

  if (!hostname) return false;
  if (key === "localhost" || key.endsWith(".localhost") || key.endsWith(".local")) {
    cache.set(key, { ok: false, expiresAt: now + 30_000 });
    return false;
  }

  const ipVersion = net.isIP(hostname);
  if (ipVersion) {
    const ok = !isBlockedIp(hostname);
    cache.set(key, { ok, expiresAt: now + 30_000 });
    return ok;
  }

  let records = [];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    cache.set(key, { ok: false, expiresAt: now + 30_000 });
    return false;
  }

  const ok = records.length > 0 && records.every((r) => !isBlockedIp(r.address));
  cache.set(key, { ok, expiresAt: now + 30_000 });
  return ok;
}

function isAllowedProtocol(protocol) {
  return (
    protocol === "http:" ||
    protocol === "https:" ||
    protocol === "file:" ||
    protocol === "data:" ||
    protocol === "about:" ||
    protocol === "blob:"
  );
}

async function shouldAllowRequestUrl(rawUrl, cache) {
  let url = null;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (!isAllowedProtocol(url.protocol)) return false;
  if (url.protocol === "http:" || url.protocol === "https:") {
    return hostnameResolvesToPublicIp(url.hostname, cache);
  }
  return true;
}

async function assertPublicHttpUrl(rawUrl) {
  let url = null;
  try {
    url = rawUrl instanceof URL ? rawUrl : new URL(rawUrl);
  } catch {
    const err = new Error("invalid_url");
    err.status = 400;
    throw err;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    const err = new Error("invalid_url_protocol");
    err.status = 400;
    throw err;
  }

  const cache = new Map();
  const ok = await hostnameResolvesToPublicIp(url.hostname, cache);
  if (!ok) {
    const err = new Error("blocked_url");
    err.status = 400;
    throw err;
  }

  return url;
}

module.exports = {
  assertPublicHttpUrl,
  shouldAllowRequestUrl,
};
