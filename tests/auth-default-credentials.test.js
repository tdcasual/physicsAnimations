const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const AUTH_PATH = "../server/lib/auth";

function loadFreshAuth() {
  delete require.cache[require.resolve(AUTH_PATH)];
  return require(AUTH_PATH);
}

function withEnvUnset(keys, fn) {
  const backup = new Map();
  for (const key of keys) {
    backup.set(key, process.env[key]);
    delete process.env[key];
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

function captureWarns(fn) {
  const originalWarn = console.warn;
  const calls = [];
  console.warn = (...args) => calls.push(args.map((arg) => String(arg)).join(" "));
  try {
    const result = fn();
    return { calls, result };
  } finally {
    console.warn = originalWarn;
  }
}

test("getAuthConfig generates random bootstrap admin credentials and logs them", async () => {
  await withEnvUnset(["ADMIN_USERNAME", "ADMIN_PASSWORD", "ADMIN_PASSWORD_HASH", "JWT_SECRET"], async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-auth-"));
    fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });

    try {
      const auth = loadFreshAuth();
      const { calls, result: config } = captureWarns(() => auth.getAuthConfig({ rootDir }));

      assert.match(config.adminUsername, /^admin_[a-f0-9]{8}$/);
      assert.ok(config.adminPasswordHash.startsWith("$2"));

      const notice = calls.find((line) => line.includes("Generated admin credentials"));
      assert.ok(notice, "expected generated credential notice in logs");
      assert.match(notice, /username=admin_[a-f0-9]{8}/);
      assert.match(notice, /password=[^\s]+/);

      const passwordMatch = notice.match(/password=([^\s]+)/);
      assert.ok(passwordMatch?.[1]);

      const ok = await auth.verifyLogin({
        username: config.adminUsername,
        password: passwordMatch[1],
        authConfig: config,
        store: null,
      });
      assert.equal(ok, true);
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });
});

test("getAuthConfig keeps explicit username and generates password when only username is provided", async () => {
  await withEnvUnset(["ADMIN_PASSWORD", "ADMIN_PASSWORD_HASH", "JWT_SECRET"], async () => {
    const oldUsername = process.env.ADMIN_USERNAME;
    process.env.ADMIN_USERNAME = "teacher";
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-auth-"));
    fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });

    try {
      const auth = loadFreshAuth();
      const { calls, result: config } = captureWarns(() => auth.getAuthConfig({ rootDir }));
      assert.equal(config.adminUsername, "teacher");

      const notice = calls.find((line) => line.includes("Generated admin credentials"));
      assert.ok(notice, "expected generated credential notice in logs");
      assert.match(notice, /username=teacher/);
    } finally {
      if (oldUsername === undefined) delete process.env.ADMIN_USERNAME;
      else process.env.ADMIN_USERNAME = oldUsername;
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });
});

