const logger = require("../lib/logger");

function errorHandler(err, req, res, _next) {
  // Keep 4-arg signature so Express treats this as error middleware.
  void _next;
  if (res.headersSent) return;

  if (err?.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "file_too_large" });
    return;
  }

  const statusCandidate = Number.isInteger(err?.status) ? err.status : 500;
  const status = statusCandidate >= 400 && statusCandidate <= 599 ? statusCandidate : 500;
  const code =
    status >= 500
      ? "server_error"
      : typeof err?.message === "string" && /^[a-z0-9_]+$/.test(err.message)
        ? err.message
        : "bad_request";

  const payload = { error: code };
  if (
    (code === "invalid_input" ||
      code === "storage_readonly" ||
      code === "risky_html_requires_confirmation") &&
    err?.details
  ) {
    payload.details = err.details;
  }

  if (status >= 500) {
    logger.error("request_failed", err, {
      status,
      code,
      method: req?.method,
      path: req?.originalUrl || req?.url,
    });
  }

  res.status(status).json(payload);
}

module.exports = {
  errorHandler,
};
