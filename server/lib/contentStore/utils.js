const fs = require("fs");
const path = require("path");

function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

function joinUrlPath(...parts) {
  return parts
    .flatMap((p) => String(p || "").split("/"))
    .filter(Boolean)
    .join("/");
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

module.exports = {
  canWriteDir,
  createBasicAuthHeader,
  ensureTrailingSlash,
  fetchWithTimeout,
  joinUrlPath,
};
