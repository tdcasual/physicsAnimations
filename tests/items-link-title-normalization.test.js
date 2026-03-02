const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const bcrypt = require("bcryptjs");
const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-link-title-"));
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(path.join(root, "animations.json"), "{}");
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
  await new Promise((resolve) => {
    server.close(resolve);
  });
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

test("link create treats whitespace-only title as empty and falls back to hostname", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig, stateDbMode: "sqlite" });
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
        url: "https://example.com/demo",
        title: "   ",
        description: "desc",
      }),
    });
    assert.equal(createRes.status, 200);
    const created = await createRes.json();
    assert.equal(created?.ok, true);
    assert.ok(created?.id);

    const detailRes = await fetch(`${baseUrl}/api/items/${encodeURIComponent(created.id)}`);
    assert.equal(detailRes.status, 200);
    const detail = await detailRes.json();
    assert.equal(detail?.item?.title, "example.com");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("item update rejects null order instead of coercing to 0", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig, stateDbMode: "sqlite" });
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
        url: "https://example.com/null-order",
        title: "Null Order",
      }),
    });
    assert.equal(createRes.status, 200);
    const created = await createRes.json();
    assert.ok(created?.id);

    const updateRes = await fetch(`${baseUrl}/api/items/${encodeURIComponent(created.id)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order: null,
      }),
    });
    assert.equal(updateRes.status, 400);
    assert.equal((await updateRes.json())?.error, "invalid_input");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
