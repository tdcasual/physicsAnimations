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

test("library folder create rejects whitespace-only name", async () => {
  const rootDir = makeTempRoot({
    prefix: "pa-lib-folder-validate-",
    animationsJson: "{}",
  });
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);
    const createFolder = await fetch(`${baseUrl}/api/library/folders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "   ",
        categoryId: "other",
      }),
    });

    assert.equal(createFolder.status, 400);
    const payload = await createFolder.json();
    assert.equal(payload?.error, "invalid_input");
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});
