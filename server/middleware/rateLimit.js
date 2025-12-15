const rateLimitState = new Map();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function rateLimit({ key, windowMs, max }) {
  return (req, res, next) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const bucketKey = `${key}:${ip}`;

    const existing = rateLimitState.get(bucketKey);
    let bucket = existing;
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
    }

    bucket.count += 1;
    rateLimitState.set(bucketKey, bucket);

    if (rateLimitState.size > 5000) {
      for (const [k, v] of rateLimitState.entries()) {
        if (now > v.resetAt) rateLimitState.delete(k);
      }
    }

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.setHeader("X-RateLimit-Reset", String(bucket.resetAt));

    if (bucket.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ error: "rate_limited", retryAfterSeconds });
      return;
    }

    next();
  };
}

module.exports = {
  rateLimit,
};

