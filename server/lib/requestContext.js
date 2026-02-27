const crypto = require("crypto");
const { AsyncLocalStorage } = require("async_hooks");

const requestContextStorage = new AsyncLocalStorage();

function sanitizeRequestId(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  const cleaned = raw.replace(/[^a-zA-Z0-9._:/-]/g, "");
  return cleaned.slice(0, 128);
}

function createRequestContext(req) {
  const incoming = sanitizeRequestId(req?.get?.("x-request-id") || req?.headers?.["x-request-id"]);
  return {
    requestId: incoming || crypto.randomUUID(),
  };
}

function runWithRequestContext(context, callback) {
  return requestContextStorage.run(context, callback);
}

function getRequestContext() {
  return requestContextStorage.getStore() || null;
}

function getRequestId() {
  return getRequestContext()?.requestId || null;
}

module.exports = {
  createRequestContext,
  runWithRequestContext,
  getRequestContext,
  getRequestId,
};
