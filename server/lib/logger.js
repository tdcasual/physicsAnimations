const { getRequestId } = require("./requestContext");

const LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_RE = /(password|token|secret|authorization|cookie|api[_-]?key|jwt)/i;

function resolveLogLevel(rawLevel) {
  const normalized = String(rawLevel || "").trim().toLowerCase();
  if (normalized in LEVEL_PRIORITY) return normalized;
  return "info";
}

let currentLogLevel = resolveLogLevel(process.env.LOG_LEVEL);

function shouldWrite(level) {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLogLevel];
}

function redactValue(value, key = "", seen = new WeakSet()) {
  if (SENSITIVE_KEY_RE.test(String(key || ""))) return "[REDACTED]";
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;

  if (value instanceof Error) {
    return redactValue(toErrorObject(value), key, seen);
  }

  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, "", seen));
  }

  const out = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    out[entryKey] = redactValue(entryValue, entryKey, seen);
  }
  return out;
}

function toErrorObject(err) {
  if (!err) return null;
  const out = {
    message: typeof err.message === "string" ? err.message : String(err),
  };
  if (typeof err.name === "string" && err.name) out.name = err.name;
  if (typeof err.code === "string" && err.code) out.code = err.code;
  if (Number.isInteger(err.status)) out.status = err.status;
  if (typeof err.errcode === "number") out.errcode = err.errcode;
  if (typeof err.errstr === "string" && err.errstr) out.errstr = err.errstr;
  if (typeof err.stack === "string" && err.stack) out.stack = err.stack;
  return out;
}

function normalizeMeta(meta) {
  if (!meta || typeof meta !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) continue;
    if (value instanceof Error) {
      out[key] = redactValue(toErrorObject(value), key);
      continue;
    }
    out[key] = redactValue(value, key);
  }
  return out;
}

function write(level, msg, meta = {}) {
  if (!shouldWrite(level)) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...normalizeMeta(meta),
  };
  const requestId = getRequestId();
  if (requestId) entry.requestId = requestId;

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

function info(msg, meta) {
  write("info", msg, meta);
}

function debug(msg, meta) {
  write("debug", msg, meta);
}

function warn(msg, meta) {
  write("warn", msg, meta);
}

function error(msg, err, meta = {}) {
  if (err instanceof Error) {
    write("error", msg, { ...meta, error: err });
    return;
  }
  if (err && typeof err === "object") {
    write("error", msg, { ...meta, ...err });
    return;
  }
  write("error", msg, meta);
}

function setLogLevel(level) {
  currentLogLevel = resolveLogLevel(level);
}

function getLogLevel() {
  return currentLogLevel;
}

module.exports = {
  debug,
  info,
  warn,
  error,
  setLogLevel,
  getLogLevel,
  resolveLogLevel,
  redactValue,
  toErrorObject,
};
