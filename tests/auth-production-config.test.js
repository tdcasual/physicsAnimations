const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const AUTH_PATH = "../server/lib/auth";
const APP_PATH = "../server/app";

function loadFresh(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function withEnvPatch(patch, fn) {
  const keys = Object.keys(patch);
  const backup = new Map();
  for (const key of keys) {
    backup.set(key, process.env[key]);
    const value = patch[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return fn();
  } finally {
    for (const key of keys) {
      const value = backup.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function makeTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-auth-prod-"));
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  return rootDir;
}

test("getAuthConfig rejects production mode without JWT_SECRET", () => {
  const rootDir = makeTempRoot();
  try {
    withEnvPatch(
      {
        NODE_ENV: "production",
        JWT_SECRET: undefined,
        ADMIN_USERNAME: "admin",
        ADMIN_PASSWORD: "secret",
        ADMIN_PASSWORD_HASH: undefined,
      },
      () => {
        const auth = loadFresh(AUTH_PATH);
        assert.throws(
          () => auth.getAuthConfig({ rootDir }),
          /production_requires_jwt_secret/,
        );
      },
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("getAuthConfig rejects production mode without admin password input", () => {
  const rootDir = makeTempRoot();
  try {
    withEnvPatch(
      {
        NODE_ENV: "production",
        JWT_SECRET: "prod-secret",
        ADMIN_USERNAME: "admin",
        ADMIN_PASSWORD: undefined,
        ADMIN_PASSWORD_HASH: undefined,
      },
      () => {
        const auth = loadFresh(AUTH_PATH);
        assert.throws(
          () => auth.getAuthConfig({ rootDir }),
          /production_requires_admin_password/,
        );
      },
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("createApp surfaces production auth config errors during startup", () => {
  const rootDir = makeTempRoot();
  try {
    withEnvPatch(
      {
        NODE_ENV: "production",
        JWT_SECRET: undefined,
        ADMIN_USERNAME: "admin",
        ADMIN_PASSWORD: "secret",
        ADMIN_PASSWORD_HASH: undefined,
      },
      () => {
        const { createApp } = loadFresh(APP_PATH);
        assert.throws(() => createApp({ rootDir }), /production_requires_jwt_secret/);
      },
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("getAuthConfig keeps bootstrap behavior outside production", () => {
  const rootDir = makeTempRoot();
  try {
    withEnvPatch(
      {
        NODE_ENV: "test",
        JWT_SECRET: undefined,
        ADMIN_USERNAME: undefined,
        ADMIN_PASSWORD: undefined,
        ADMIN_PASSWORD_HASH: undefined,
      },
      () => {
        const auth = loadFresh(AUTH_PATH);
        const config = auth.getAuthConfig({ rootDir });
        assert.match(config.adminUsername, /^admin_[a-f0-9]{8}$/);
        assert.equal(config.jwtSecretSource, "file");
      },
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
