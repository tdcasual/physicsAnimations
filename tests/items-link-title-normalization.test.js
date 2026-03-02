const test = require("node:test");
const assert = require("node:assert/strict");

const bcrypt = require("bcryptjs");
const { createApp } = require("../server/app");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");
const { startServer, stopServer } = require("./helpers/testServer");

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
  const rootDir = makeTempRoot({
    prefix: "pa-link-title-",
    animationsJson: "{}",
  });
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig, stateDbMode: "sqlite" });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const createRes = await fetch(`${baseUrl}/api/items`, {
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
    removeTempRoot(rootDir);
  }
});

test("item update rejects null order instead of coercing to 0", async () => {
  const rootDir = makeTempRoot({
    prefix: "pa-link-title-",
    animationsJson: "{}",
  });
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig, stateDbMode: "sqlite" });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const createRes = await fetch(`${baseUrl}/api/items`, {
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
    removeTempRoot(rootDir);
  }
});
