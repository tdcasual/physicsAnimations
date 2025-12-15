function errorHandler(err, _req, res, _next) {
  if (res.headersSent) return;

  if (err?.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "file_too_large" });
    return;
  }

  const status = Number.isInteger(err?.status) ? err.status : 500;
  const code =
    typeof err?.message === "string" && /^[a-z0-9_]+$/.test(err.message)
      ? err.message
      : status >= 500
        ? "server_error"
        : "bad_request";

  const payload = { error: code };
  if (code === "invalid_input" && err?.details) payload.details = err.details;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json(payload);
}

module.exports = {
  errorHandler,
};

