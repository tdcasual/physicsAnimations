function securityHeadersMiddleware(req, res, next) {
  if (String(req.path || "").startsWith("/api/")) {
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
