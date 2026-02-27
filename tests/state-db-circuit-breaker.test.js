const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");
const { loadNodeSqlite } = require("../server/lib/nodeSqlite");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-state-db-circuit-"));
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(path.join(root, "animations.json"), "{}\n");
  fs.writeFileSync(
    path.join(root, "content", "items.json"),
    JSON.stringify(
      {
        version: 2,
        items: [
          {
            id: "l_public_1",
            type: "link",
            categoryId: "other",
            url: "https://example.com/public-1",
            title: "Public Link One",
            description: "alpha",
            thumbnail: "",
            order: 0,
            published: true,
            hidden: false,
            uploadKind: "html",
            createdAt: "2026-01-03T00:00:00.000Z",
            updatedAt: "2026-01-03T00:00:00.000Z",
          },
        ],
      },
      null,
      2,
    ),
  );
  return root;
}

function makeAuthConfig() {
  return {
    adminUsername: "admin",
    adminPasswordHash: bcrypt.hashSync("secret", 10),
    jwtSecret: "state-db-circuit-secret",
    jwtIssuer: "physicsAnimations",
    jwtAudience: "physicsAnimations-web",
    tokenTtlSeconds: 3600,
  };
}

async function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function stopServer(server) {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}

async function login(baseUrl, authConfig) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: authConfig.adminUsername, password: "secret" }),
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data?.token);
  return data.token;
}

test("state db opens circuit and /api/items returns state_db_unavailable when SQL path breaks", async () => {
  const sqlite = loadNodeSqlite();
  if (!sqlite) return;

  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const dbPath = path.join(rootDir, "content", "state.sqlite");

  const app = createApp({
    rootDir,
    authConfig,
    stateDbMode: "sqlite",
    stateDbPath: dbPath,
    stateDbMaxErrors: 1,
  });
  const { server, baseUrl } = await startServer(app);

  try {
    const firstRes = await fetch(`${baseUrl}/api/items?page=1&pageSize=20`);
    assert.equal(firstRes.status, 200);
    const first = await firstRes.json();
    assert.equal((first.items || []).some((it) => it.id === "l_public_1"), true);

    const db = new sqlite.DatabaseSync(dbPath);
    db.exec("DROP TABLE state_dynamic_items");

    const secondRes = await fetch(`${baseUrl}/api/items?page=1&pageSize=20`);
    assert.equal(secondRes.status, 503);
    const second = await secondRes.json();
    assert.equal(second.error, "state_db_unavailable");

    const token = await login(baseUrl, authConfig);
    const metricsRes = await fetch(`${baseUrl}/api/metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(metricsRes.status, 200);
    const metrics = await metricsRes.json();

    assert.equal(metrics?.stateDb?.enabled, true);
    assert.equal(metrics?.stateDb?.circuitOpen, true);
    assert.equal(metrics?.stateDb?.healthy, false);
    assert.equal((metrics?.stateDb?.errorCount || 0) >= 1, true);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
