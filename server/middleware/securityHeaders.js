function isSpaRoute(reqPath) {
  const p = String(reqPath || "");
  if (!p.startsWith("/")) return false;
  if (p.startsWith("/api/") || p === "/api") return false;
  if (p.startsWith("/assets/") || p === "/assets") return false;
  if (p.startsWith("/content/") || p === "/content") return false;
  return true;
}

function securityHeadersMiddleware(req, res, next) {
  const path = String(req.path || "");

  // Base security headers for all routes
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  // CSP for SPA routes (HTML responses)
  if (isSpaRoute(path)) {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob: https:; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "connect-src 'self' /api/; " +
        "frame-src 'self' /content/ https:; " +
        "manifest-src 'self';"
    );
  }

  next();
}

module.exports = {
  securityHeadersMiddleware,
};
