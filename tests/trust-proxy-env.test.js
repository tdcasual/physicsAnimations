const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createApp } = require("../server/app");

function makeTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-trust-proxy-"));
  fs.mkdirSync(path.join(rootDir, "assets"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "animations"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "animations.json"), "{}\n", "utf8");
  return rootDir;
}

function makeAuthConfig() {
  return {
    adminUsername: "admin",
    adminPasswordHash: bcrypt.hashSync("secret", 10),
    jwtSecret: "test-secret",
    jwtIssuer: "physicsAnimations",
    jwtAudience: "physicsAnimations-web",
    tokenTtlSeconds: 3600,
  };
}

test("createApp accepts uppercase TRUST_PROXY boolean values", () => {
  const previous = process.env.TRUST_PROXY;
  const rootDir = makeTempRoot();

  process.env.TRUST_PROXY = "TRUE";
  try {
    const app = createApp({ rootDir, authConfig: makeAuthConfig() });
    assert.equal(app.get("trust proxy"), true);
  } finally {
    if (previous === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("createApp normalizes TRUST_PROXY numeric strings with leading zeros", () => {
  const previous = process.env.TRUST_PROXY;
  const rootDir = makeTempRoot();

  process.env.TRUST_PROXY = "01";
  try {
    const app = createApp({ rootDir, authConfig: makeAuthConfig() });
    assert.equal(app.get("trust proxy"), 1);
  } finally {
    if (previous === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("createApp does not crash on invalid TRUST_PROXY value", () => {
  const previous = process.env.TRUST_PROXY;
  const rootDir = makeTempRoot();

  process.env.TRUST_PROXY = "foo";
  try {
    const app = createApp({ rootDir, authConfig: makeAuthConfig() });
    assert.equal(app.get("trust proxy"), false);
  } finally {
    if (previous === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
