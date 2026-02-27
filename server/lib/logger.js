const { getRequestId } = require("./requestContext");

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
      out[key] = toErrorObject(value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function write(level, msg, meta = {}) {
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

module.exports = {
  info,
  warn,
  error,
  toErrorObject,
};
