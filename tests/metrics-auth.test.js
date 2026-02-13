const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-metrics-"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>test</title>");
  fs.writeFileSync(path.join(root, "viewer.html"), "<!doctype html><title>viewer</title>");
  fs.writeFileSync(path.join(root, "animations.json"), "{}\n");
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  return root;
}

function makeAuthConfig() {
  return {
    adminUsername: "admin",
    adminPasswordHash: bcrypt.hashSync("admin", 4),
    jwtSecret: "test-secret",
    jwtSecretSource: "test",
    jwtIssuer: "physicsAnimations",
    jwtAudience: "physicsAnimations-web",
    tokenTtlSeconds: 3600,
  };
}

async function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

async function stopServer(server) {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}

async function login(baseUrl) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin" }),
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data?.token);
  return data.token;
}

test("/api/metrics requires auth by default", async () => {
  const rootDir = makeTempRoot();
  const app = createApp({ rootDir, authConfig: makeAuthConfig() });
  const { server, baseUrl } = await startServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/metrics`);
    assert.equal(response.status, 401);
    const data = await response.json();
    assert.equal(data?.error, "missing_token");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("/api/metrics returns data when authenticated", async () => {
  const rootDir = makeTempRoot();
  const app = createApp({ rootDir, authConfig: makeAuthConfig() });
  const { server, baseUrl } = await startServer(app);
  try {
    const token = await login(baseUrl);
    const response = await fetch(`${baseUrl}/api/metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(typeof data?.uptimeSec, "number");
    assert.equal(typeof data?.memory, "object");
    assert.equal(typeof data?.screenshotQueue, "object");
    assert.equal(typeof data?.taskQueue, "object");
    assert.equal(typeof data?.taskQueue?.concurrency, "number");
    assert.equal(typeof data?.stateDb, "object");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("/api/metrics supports explicit public mode", async () => {
  const rootDir = makeTempRoot();
  const app = createApp({
    rootDir,
    authConfig: makeAuthConfig(),
    metricsPublic: true,
  });
  const { server, baseUrl } = await startServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/metrics`);
    assert.equal(response.status, 200);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
