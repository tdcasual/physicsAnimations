const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-auth-account-"));
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(path.join(root, "animations.json"), JSON.stringify({}, null, 2));
  return root;
}

async function startServer(app) {
  return await new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address?.port}`,
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

async function login(baseUrl, username, password) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test("auth account rejects whitespace-only newUsername and does not apply password update", async () => {
  const rootDir = makeTempRoot();
  const authConfig = {
    adminUsername: "admin",
    adminPasswordHash: bcrypt.hashSync("secret", 10),
    jwtSecret: "test-secret",
    jwtIssuer: "physicsAnimations",
    jwtAudience: "physicsAnimations-web",
    tokenTtlSeconds: 3600,
  };

  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const initialLogin = await login(baseUrl, "admin", "secret");
    assert.equal(initialLogin.status, 200);
    assert.equal(typeof initialLogin.data?.token, "string");

    const updateRes = await fetch(`${baseUrl}/api/auth/account`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${initialLogin.data.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword: "secret",
        newUsername: "   ",
        newPassword: "changed-password",
      }),
    });
    assert.equal(updateRes.status, 400);
    const updateData = await updateRes.json();
    assert.equal(updateData?.error, "invalid_username");

    const oldLogin = await login(baseUrl, "admin", "secret");
    assert.equal(oldLogin.status, 200);
    const newLogin = await login(baseUrl, "admin", "changed-password");
    assert.equal(newLogin.status, 401);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("auth account rejects whitespace-only newPassword and does not apply username update", async () => {
  const rootDir = makeTempRoot();
  const authConfig = {
    adminUsername: "admin",
    adminPasswordHash: bcrypt.hashSync("secret", 10),
    jwtSecret: "test-secret",
    jwtIssuer: "physicsAnimations",
    jwtAudience: "physicsAnimations-web",
    tokenTtlSeconds: 3600,
  };

  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const initialLogin = await login(baseUrl, "admin", "secret");
    assert.equal(initialLogin.status, 200);
    assert.equal(typeof initialLogin.data?.token, "string");

    const updateRes = await fetch(`${baseUrl}/api/auth/account`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${initialLogin.data.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword: "secret",
        newUsername: "admin2",
        newPassword: "   ",
      }),
    });
    assert.equal(updateRes.status, 400);
    const updateData = await updateRes.json();
    assert.equal(updateData?.error, "invalid_password");

    const oldLogin = await login(baseUrl, "admin", "secret");
    assert.equal(oldLogin.status, 200);
    const renamedLogin = await login(baseUrl, "admin2", "secret");
    assert.equal(renamedLogin.status, 401);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
