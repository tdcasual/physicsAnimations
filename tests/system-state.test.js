const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");
const { loadNodeSqlite } = require("../server/lib/nodeSqlite");

function hasNodeSqlite() {
  return Boolean(loadNodeSqlite());
}

function makeTempRoot({ animationsJson } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-test-"));
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "animations.json"),
    JSON.stringify(animationsJson || {}, null, 2),
  );
  return root;
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

async function login(baseUrl, authConfig) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: authConfig.adminUsername,
      password: "secret",
    }),
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data?.token);
  return data.token;
}

test("delete dynamic item writes tombstone", async () => {
  const rootDir = makeTempRoot();
  fs.writeFileSync(
    path.join(rootDir, "content", "items.json"),
    JSON.stringify(
      {
        version: 2,
        items: [
          {
            id: "l_test",
            type: "link",
            categoryId: "other",
            url: "https://example.com",
            title: "Test",
            description: "",
            thumbnail: "",
            order: 0,
            published: true,
            hidden: false,
            uploadKind: "html",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
      null,
      2,
    ),
  );

  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);
  try {
    const token = await login(baseUrl, authConfig);
    const response = await fetch(`${baseUrl}/api/items/l_test`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);

    const tombPath = path.join(rootDir, "content", "items_tombstones.json");
    assert.ok(fs.existsSync(tombPath));
    const tomb = JSON.parse(fs.readFileSync(tombPath, "utf8"));
    assert.equal(tomb.version, 1);
    assert.ok(tomb.tombstones?.l_test?.deletedAt);

    const items = JSON.parse(fs.readFileSync(path.join(rootDir, "content", "items.json"), "utf8"));
    assert.ok(Array.isArray(items.items));
    assert.equal(items.items.some((it) => it.id === "l_test"), false);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("system storage persists scanRemote flag", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);
  try {
    const token = await login(baseUrl, authConfig);
    const update = await fetch(`${baseUrl}/api/system/storage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "local",
        webdav: { scanRemote: true },
        sync: false,
      }),
    });
    assert.equal(update.status, 200);
    const updated = await update.json();
    assert.equal(updated?.storage?.webdav?.scanRemote, true);

    const res = await fetch(`${baseUrl}/api/system`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const system = await res.json();
    assert.equal(system?.storage?.webdav?.scanRemote, true);
    assert.equal(system?.storage?.stateDb?.enabled, false);
    assert.equal(typeof system?.taskQueue, "object");
    assert.equal(typeof system?.taskQueue?.concurrency, "number");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("system storage validate requires webdav url", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);
  try {
    const token = await login(baseUrl, authConfig);
    const res = await fetch(`${baseUrl}/api/system/storage/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webdav: { url: "  " },
      }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data?.error, "webdav_missing_url");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("system storage local mode does not trigger sync", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);
  try {
    const token = await login(baseUrl, authConfig);

    const preset = await fetch(`${baseUrl}/api/system/storage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "local",
        webdav: { url: "https://dav.example.com/root" },
        sync: false,
      }),
    });
    assert.equal(preset.status, 200);

    const syncRes = await fetch(`${baseUrl}/api/system/storage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "local",
        sync: true,
      }),
    });
    assert.equal(syncRes.status, 200);
    const syncData = await syncRes.json();
    assert.equal(syncData?.sync, null);

    const systemRes = await fetch(`${baseUrl}/api/system`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(systemRes.status, 200);
    const systemData = await systemRes.json();
    assert.equal(systemData?.storage?.mode, "local");
    assert.equal(systemData?.storage?.lastSyncedAt || "", "");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("state db sqlite mirrors state writes", async () => {
  if (!hasNodeSqlite()) return;

  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const dbPath = path.join(rootDir, "content", "state.sqlite");

  const app = createApp({
    rootDir,
    authConfig,
    stateDbMode: "sqlite",
    stateDbPath: dbPath,
  });
  const { server, baseUrl } = await startServer(app);
  try {
    const token = await login(baseUrl, authConfig);

    const createRes = await fetch(`${baseUrl}/api/items/link`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "link",
        url: "https://example.com",
        categoryId: "other",
        title: "State DB Test",
        description: "",
      }),
    });
    assert.equal(createRes.status, 200);

    const metricsRes = await fetch(`${baseUrl}/api/metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(metricsRes.status, 200);
    const metrics = await metricsRes.json();
    assert.equal(metrics?.stateDb?.enabled, true);
    assert.equal(metrics?.stateDb?.mode, "sqlite");
    assert.equal(metrics?.stateDb?.available, true);
    assert.equal(metrics?.stateDb?.healthy, true);
    assert.equal(metrics?.stateDb?.circuitOpen, false);
    assert.equal(typeof metrics?.taskQueue, "object");

    const systemRes = await fetch(`${baseUrl}/api/system`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(systemRes.status, 200);
    const system = await systemRes.json();
    assert.equal(system?.storage?.stateDb?.enabled, true);
    assert.equal(system?.storage?.stateDb?.mode, "sqlite");
    assert.equal(system?.storage?.stateDb?.healthy, true);
    assert.equal(typeof system?.taskQueue, "object");

    assert.equal(fs.existsSync(dbPath), true);
    const sqlite = loadNodeSqlite();
    assert.ok(sqlite);
    const db = new sqlite.DatabaseSync(dbPath);
    const row = db
      .prepare("SELECT LENGTH(value) as bytes FROM state_blobs WHERE key = ?")
      .get("items.json");
    assert.ok(row);
    assert.equal(Number.isFinite(row.bytes), true);
    assert.ok(row.bytes > 0);
    db.close();
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
