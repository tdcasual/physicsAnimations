const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");

function makeTempRoot({ animationsJson } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-test-"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>test</title>");
  fs.writeFileSync(path.join(root, "viewer.html"), "<!doctype html><title>viewer</title>");
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
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

