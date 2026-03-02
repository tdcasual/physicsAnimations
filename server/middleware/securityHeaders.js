function securityHeadersMiddleware(req, res, next) {
  const path = String(req.path || "");
  if (path === "/api" || path.startsWith("/api/")) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  }
  next();
}

module.exports = {
  securityHeadersMiddleware,
};
