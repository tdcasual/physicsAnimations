const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const bcrypt = require("bcryptjs");
const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-taxonomy-validate-"));
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "animations.json"),
    JSON.stringify(
      {
        mechanics: {
          title: "力学",
          items: [
            {
              file: "mechanics/a.html",
              title: "A",
              description: "",
              thumbnail: "",
            },
          ],
        },
      },
      null,
      2,
    ),
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

test("taxonomy create endpoints reject whitespace-only titles", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);

    const createGroupRes = await fetch(`${baseUrl}/api/groups`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "math",
        title: "   ",
      }),
    });
    assert.equal(createGroupRes.status, 400);
    assert.equal((await createGroupRes.json())?.error, "invalid_input");

    const createCategoryRes = await fetch(`${baseUrl}/api/categories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "algebra",
        groupId: "physics",
        title: "   ",
      }),
    });
    assert.equal(createCategoryRes.status, 400);
    assert.equal((await createCategoryRes.json())?.error, "invalid_input");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("taxonomy endpoints reject reserved prototype-related ids", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);

    const createGroupRes = await fetch(`${baseUrl}/api/groups`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "constructor",
        title: "Constructor Group",
      }),
    });
    assert.equal(createGroupRes.status, 400);
    assert.equal((await createGroupRes.json())?.error, "invalid_input");

    const createCategoryRes = await fetch(`${baseUrl}/api/categories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "prototype",
        groupId: "physics",
        title: "Prototype Category",
      }),
    });
    assert.equal(createCategoryRes.status, 400);
    assert.equal((await createCategoryRes.json())?.error, "invalid_input");

    const updateGroupRes = await fetch(`${baseUrl}/api/groups/constructor`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Updated",
      }),
    });
    assert.equal(updateGroupRes.status, 400);
    assert.equal((await updateGroupRes.json())?.error, "invalid_input");

    const updateCategoryRes = await fetch(`${baseUrl}/api/categories/prototype`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Updated",
      }),
    });
    assert.equal(updateCategoryRes.status, 400);
    assert.equal((await updateCategoryRes.json())?.error, "invalid_input");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("taxonomy update endpoints reject null order instead of coercing to 0", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);

  try {
    const token = await login(baseUrl, authConfig);

    const createGroupRes = await fetch(`${baseUrl}/api/groups`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "math",
        title: "Math",
      }),
    });
    assert.equal(createGroupRes.status, 200);

    const createCategoryRes = await fetch(`${baseUrl}/api/categories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "algebra",
        groupId: "math",
        title: "Algebra",
      }),
    });
    assert.equal(createCategoryRes.status, 200);

    const updateGroupRes = await fetch(`${baseUrl}/api/groups/math`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order: null,
      }),
    });
    assert.equal(updateGroupRes.status, 400);
    assert.equal((await updateGroupRes.json())?.error, "invalid_input");

    const updateCategoryRes = await fetch(`${baseUrl}/api/categories/algebra`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order: null,
      }),
    });
    assert.equal(updateCategoryRes.status, 400);
    assert.equal((await updateCategoryRes.json())?.error, "invalid_input");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
