const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");

function makeTempRoot({ animationsJson } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-test-"));
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "animations.json"),
    JSON.stringify(
      animationsJson || {
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

test("catalog returns groups structure (public)", async () => {
  const rootDir = makeTempRoot();
  const app = createApp({ rootDir, authConfig: makeAuthConfig() });
  const { server, baseUrl } = await startServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/catalog`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(typeof data, "object");
    assert.ok(data.groups);
    assert.ok(data.groups.physics);
    assert.ok(data.groups.physics.categories);
    assert.ok(data.groups.physics.categories.mechanics);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("/api/categories returns groups and categories with groupId", async () => {
  const rootDir = makeTempRoot();
  const app = createApp({ rootDir, authConfig: makeAuthConfig() });
  const { server, baseUrl } = await startServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/categories`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(Array.isArray(data.groups));
    assert.ok(Array.isArray(data.categories));
    const mechanics = data.categories.find((c) => c.id === "mechanics");
    assert.ok(mechanics);
    assert.equal(mechanics.groupId, "physics");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("category create rejects unknown group", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();
  const app = createApp({ rootDir, authConfig });
  const { server, baseUrl } = await startServer(app);
  try {
    const token = await login(baseUrl, authConfig);
    const response = await fetch(`${baseUrl}/api/categories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: "algebra", groupId: "math", title: "代数" }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, "unknown_group");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("group and category CRUD works", async () => {
  const rootDir = makeTempRoot({ animationsJson: {} });
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
      body: JSON.stringify({ id: "math", title: "数学", order: 10, hidden: false }),
    });
    assert.equal(createGroupRes.status, 200);

    const createCatRes = await fetch(`${baseUrl}/api/categories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: "algebra", groupId: "math", title: "代数", order: 0, hidden: false }),
    });
    assert.equal(createCatRes.status, 200);

    const listRes = await fetch(`${baseUrl}/api/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(listRes.status, 200);
    const listed = await listRes.json();
    assert.ok(listed.groups.find((g) => g.id === "math"));
    const algebra = listed.categories.find((c) => c.id === "algebra");
    assert.ok(algebra);
    assert.equal(algebra.groupId, "math");

    const deleteGroupBlocked = await fetch(`${baseUrl}/api/groups/math`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(deleteGroupBlocked.status, 400);
    assert.equal((await deleteGroupBlocked.json()).error, "group_not_empty");

    const deleteCategoryRes = await fetch(`${baseUrl}/api/categories/algebra`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(deleteCategoryRes.status, 200);

    const deleteGroupOk = await fetch(`${baseUrl}/api/groups/math`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(deleteGroupOk.status, 200);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("legacy categories.json v1 migrates to v2 with physics groupId", async () => {
  const rootDir = makeTempRoot({
    animationsJson: {
      mechanics: { title: "力学", items: [{ file: "mechanics/a.html", title: "A", description: "", thumbnail: "" }] },
    },
  });
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, "content", "categories.json"),
    JSON.stringify(
      {
        version: 1,
        categories: {
          mechanics: {
            id: "mechanics",
            title: "力学（自定义）",
            order: 9,
            hidden: true,
          },
        },
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
    const res = await fetch(`${baseUrl}/api/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    const mechanics = data.categories.find((c) => c.id === "mechanics");
    assert.ok(mechanics);
    assert.equal(mechanics.groupId, "physics");
    assert.equal(mechanics.title, "力学（自定义）");
    assert.equal(mechanics.order, 9);
    assert.equal(mechanics.hidden, true);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

