const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { loadAdminState } = require("./adminState");
const logger = require("./logger");

const DEFAULT_ADMIN_USERNAME = "admin";
const JWT_SECRET_FILE = ".jwt_secret";
let didWarnEphemeralJwtSecret = false;
let didWarnGeneratedAdminCredentials = false;

function parseOptionalEnvString(name) {
  const raw = process.env[name];
  if (typeof raw !== "string") return "";
  return raw.trim();
}

function generateRandomCredentialPart(byteLength = 9) {
  return crypto.randomBytes(byteLength).toString("base64url");
}

function resolveAdminCredentialDefaults() {
  const envUsername = parseOptionalEnvString("ADMIN_USERNAME");
  const envPasswordHash = parseOptionalEnvString("ADMIN_PASSWORD_HASH");
  const envPassword = process.env.ADMIN_PASSWORD || "";

  if (envPasswordHash) {
    return {
      username: envUsername || DEFAULT_ADMIN_USERNAME,
      passwordHash: envPasswordHash,
      source: "env_password_hash",
      generatedPassword: "",
    };
  }

  if (envPassword) {
    return {
      username: envUsername || DEFAULT_ADMIN_USERNAME,
      passwordHash: bcrypt.hashSync(envPassword, 10),
      source: "env_password",
      generatedPassword: "",
    };
  }

  const generatedPassword = generateRandomCredentialPart(12);
  if (envUsername) {
    return {
      username: envUsername,
      passwordHash: bcrypt.hashSync(generatedPassword, 10),
      source: "generated_password",
      generatedPassword,
    };
  }

  const generatedUsername = `admin_${crypto.randomBytes(4).toString("hex")}`;
  return {
    username: generatedUsername,
    passwordHash: bcrypt.hashSync(generatedPassword, 10),
    source: "generated_username_password",
    generatedPassword,
  };
}

function warnGeneratedAdminCredentials({ username, password }) {
  if (didWarnGeneratedAdminCredentials) return;
  didWarnGeneratedAdminCredentials = true;
  // Intentionally plain-text for first bootstrap in self-hosted/Docker setups.
  console.warn(
    `[physicsAnimations] Generated admin credentials: username=${username} password=${password}`,
  );
  console.warn(
    "[physicsAnimations] Set ADMIN_USERNAME and ADMIN_PASSWORD/ADMIN_PASSWORD_HASH to override this bootstrap behavior.",
  );
}

function loadJwtSecretFromFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();
    return raw || "";
  } catch {
    return "";
  }
}

function persistJwtSecret(filePath, secret) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${secret}\n`, { mode: 0o600 });
    return true;
  } catch {
    // Ignore persistence errors; we'll fall back to in-memory secret.
    return false;
  }
}

function resolveJwtSecretWithSource({ rootDir } = {}) {
  if (process.env.JWT_SECRET) return { secret: process.env.JWT_SECRET, source: "env" };
  if (!rootDir) return { secret: crypto.randomBytes(32).toString("hex"), source: "memory" };

  const secretPath = path.join(rootDir, "content", JWT_SECRET_FILE);
  const existing = loadJwtSecretFromFile(secretPath);
  if (existing) return { secret: existing, source: "file" };

  const generated = crypto.randomBytes(32).toString("hex");
  const persisted = persistJwtSecret(secretPath, generated);
  return { secret: generated, source: persisted ? "file" : "memory" };
}

function getAuthConfig({ rootDir } = {}) {
  const adminDefaults = resolveAdminCredentialDefaults();
  const adminUsername = adminDefaults.username;
  const adminPasswordHash = adminDefaults.passwordHash;
  if (adminDefaults.generatedPassword) {
    warnGeneratedAdminCredentials({
      username: adminUsername,
      password: adminDefaults.generatedPassword,
    });
  }

  const { secret: jwtSecret, source: jwtSecretSource } = resolveJwtSecretWithSource({ rootDir });
  if (jwtSecretSource === "memory" && !process.env.JWT_SECRET && !didWarnEphemeralJwtSecret) {
    didWarnEphemeralJwtSecret = true;
    logger.warn("auth_ephemeral_jwt_secret", {
      message:
        "JWT secret is ephemeral (not persisted). Tokens will be invalid after restart/cold start.",
      hint: "set JWT_SECRET in env",
    });
  }

  const jwtIssuer = process.env.JWT_ISSUER || "physicsAnimations";
  const jwtAudience = process.env.JWT_AUDIENCE || "physicsAnimations-web";
  const tokenTtlSeconds = Number.parseInt(process.env.JWT_TTL_SECONDS || "28800", 10);

  return {
    adminUsername,
    adminPasswordHash,
    adminCredentialsSource: adminDefaults.source,
    jwtSecret,
    jwtSecretSource,
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
    } catch {
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

async function resolveAdminCredentials({ authConfig, store }) {
  if (store) {
    const state = await loadAdminState({ store });
    if (state?.username && state?.passwordHash) {
      return { username: state.username, passwordHash: state.passwordHash };
    }
  }
  return { username: authConfig.adminUsername, passwordHash: authConfig.adminPasswordHash };
}

async function verifyLogin({ username, password, authConfig, store }) {
  const current = await resolveAdminCredentials({ authConfig, store });
  if (username !== current.username) return false;
  return bcrypt.compare(password, current.passwordHash);
}

module.exports = {
  getAuthConfig,
  resolveAdminCredentials,
  issueToken,
  requireAuth,
  optionalAuth,
  verifyLogin,
};
