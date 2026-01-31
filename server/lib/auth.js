const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin";
const DEFAULT_JWT_SECRET = "physicsAnimations";

function getAuthConfig() {
  const adminUsername = process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME;
  const adminPasswordHash =
    process.env.ADMIN_PASSWORD_HASH ||
    bcrypt.hashSync(process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD, 10);

  const jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

  const jwtIssuer = process.env.JWT_ISSUER || "physicsAnimations";
  const jwtAudience = process.env.JWT_AUDIENCE || "physicsAnimations-web";
  const tokenTtlSeconds = Number.parseInt(process.env.JWT_TTL_SECONDS || "28800", 10);

  return {
    adminUsername,
    adminPasswordHash,
    jwtSecret,
    jwtIssuer,
    jwtAudience,
    tokenTtlSeconds,
  };
}

function issueToken({ username, authConfig }) {
  return jwt.sign(
    { sub: username, role: "admin" },
    authConfig.jwtSecret,
    {
      issuer: authConfig.jwtIssuer,
      audience: authConfig.jwtAudience,
      expiresIn: authConfig.tokenTtlSeconds,
    },
  );
}

function parseBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

function requireAuth({ authConfig }) {
  return (req, res, next) => {
    const token = parseBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "missing_token" });
      return;
    }

    try {
      const payload = jwt.verify(token, authConfig.jwtSecret, {
        issuer: authConfig.jwtIssuer,
        audience: authConfig.jwtAudience,
      });
      req.user = { username: payload.sub, role: payload.role };
      next();
    } catch (err) {
      res.status(401).json({ error: "invalid_token" });
    }
  };
}

function optionalAuth({ authConfig }) {
  return (req, res, next) => {
    const hasAuthHeader = Boolean(req.headers.authorization);
    if (!hasAuthHeader) {
      next();
      return;
    }

    const token = parseBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "invalid_token" });
      return;
    }

    try {
      const payload = jwt.verify(token, authConfig.jwtSecret, {
        issuer: authConfig.jwtIssuer,
        audience: authConfig.jwtAudience,
      });
      req.user = { username: payload.sub, role: payload.role };
      next();
    } catch {
      res.status(401).json({ error: "invalid_token" });
    }
  };
}

async function verifyLogin({ username, password, authConfig }) {
  if (username !== authConfig.adminUsername) return false;
  return bcrypt.compare(password, authConfig.adminPasswordHash);
}

module.exports = {
  getAuthConfig,
  issueToken,
  requireAuth,
  optionalAuth,
  verifyLogin,
};
