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

test("library deleted-assets rejects invalid folderId query values", async () => {
  const rootDir = makeTempRoot({
    prefix: "pa-lib-deleted-query-",
    animationsJson: "{}",
  });
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const invalidFolderId = "f_".padEnd(160, "x");
    const res = await fetch(
      `${baseUrl}/api/library/deleted-assets?folderId=${encodeURIComponent(invalidFolderId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body?.error, "invalid_input");
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});
