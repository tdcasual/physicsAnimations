const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");

function makeTempRoot({ animationsJson } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-categories-sql-"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>test</title>");
  fs.writeFileSync(path.join(root, "viewer.html"), "<!doctype html><title>viewer</title>");
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
              file: "mechanics/demo.html",
              title: "Builtin Demo",
              description: "builtin",
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

function makeAuthConfig() {
  return {
    adminUsername: "admin",
    adminPasswordHash: bcrypt.hashSync("secret", 10),
    jwtSecret: "categories-sql-secret",
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

function writeItems(rootDir, items) {
  fs.writeFileSync(
    path.join(rootDir, "content", "items.json"),
    JSON.stringify({ version: 2, items }, null, 2),
  );
}

function writeCategories(rootDir, payload) {
  fs.writeFileSync(path.join(rootDir, "content", "categories.json"), JSON.stringify(payload, null, 2));
}

test("/api/categories keeps taxonomy semantics with SQL dynamic counts", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();

  writeItems(rootDir, [
    {
      id: "d_mechanics_public",
      type: "link",
      categoryId: "mechanics",
      url: "https://example.com/m1",
      title: "Mechanics Public",
      description: "",
      thumbnail: "",
      order: 0,
      published: true,
      hidden: false,
      uploadKind: "html",
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
    },
    {
      id: "d_mechanics_hidden",
      type: "link",
      categoryId: "mechanics",
      url: "https://example.com/m2",
      title: "Mechanics Hidden",
      description: "",
      thumbnail: "",
      order: 0,
      published: true,
      hidden: true,
      uploadKind: "html",
      createdAt: "2026-01-09T00:00:00.000Z",
      updatedAt: "2026-01-09T00:00:00.000Z",
    },
    {
      id: "d_mechanics_unpublished",
      type: "link",
      categoryId: "mechanics",
      url: "https://example.com/m3",
      title: "Mechanics Unpublished",
      description: "",
      thumbnail: "",
      order: 0,
      published: false,
      hidden: false,
      uploadKind: "html",
      createdAt: "2026-01-08T00:00:00.000Z",
      updatedAt: "2026-01-08T00:00:00.000Z",
    },
    {
      id: "d_algebra",
      type: "link",
      categoryId: "algebra",
      url: "https://example.com/algebra",
      title: "Algebra",
      description: "",
      thumbnail: "",
      order: 0,
      published: true,
      hidden: false,
      uploadKind: "html",
      createdAt: "2026-01-07T00:00:00.000Z",
      updatedAt: "2026-01-07T00:00:00.000Z",
    },
    {
      id: "d_customx",
      type: "link",
      categoryId: "customx",
      url: "https://example.com/customx",
      title: "CustomX",
      description: "",
      thumbnail: "",
      order: 0,
      published: true,
      hidden: false,
      uploadKind: "html",
      createdAt: "2026-01-06T00:00:00.000Z",
      updatedAt: "2026-01-06T00:00:00.000Z",
    },
    {
      id: "d_hiddencat",
      type: "link",
      categoryId: "hiddencat",
      url: "https://example.com/hiddencat",
      title: "Hidden Category",
      description: "",
      thumbnail: "",
      order: 0,
      published: true,
      hidden: false,
      uploadKind: "html",
      createdAt: "2026-01-05T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
    },
    {
      id: "d_ghostcat",
      type: "link",
      categoryId: "ghostcat",
      url: "https://example.com/ghostcat",
      title: "Ghost Category",
      description: "",
      thumbnail: "",
      order: 0,
      published: true,
      hidden: false,
      uploadKind: "html",
      createdAt: "2026-01-04T00:00:00.000Z",
      updatedAt: "2026-01-04T00:00:00.000Z",
    },
  ]);

  writeCategories(rootDir, {
    version: 2,
    groups: {
      math: { id: "math", title: "数学", order: 9, hidden: false },
      ghost: { id: "ghost", title: "隐藏组", order: 7, hidden: true },
    },
    categories: {
      algebra: { id: "algebra", groupId: "math", title: "代数", order: 4, hidden: false },
      hiddencat: { id: "hiddencat", groupId: "math", title: "隐藏分类", order: 3, hidden: true },
      ghostcat: { id: "ghostcat", groupId: "ghost", title: "幽灵分类", order: 2, hidden: false },
      emptyonly: { id: "emptyonly", groupId: "math", title: "空分类", order: 1, hidden: false },
    },
  });

  const app = createApp({
    rootDir,
    authConfig,
    stateDbMode: "sqlite",
    stateDbPath: path.join(rootDir, "content", "state.sqlite"),
  });

  const { server, baseUrl } = await startServer(app);
  try {
    const publicRes = await fetch(`${baseUrl}/api/categories`);
    assert.equal(publicRes.status, 200);
    const publicData = await publicRes.json();

    const publicCategories = new Map((publicData.categories || []).map((category) => [category.id, category]));
    assert.equal(publicCategories.has("mechanics"), true);
    assert.equal(publicCategories.has("algebra"), true);
    assert.equal(publicCategories.has("customx"), true);
    assert.equal(publicCategories.has("hiddencat"), false);
    assert.equal(publicCategories.has("ghostcat"), false);
    assert.equal(publicCategories.has("emptyonly"), false);

    assert.equal(publicCategories.get("mechanics")?.builtinCount, 1);
    assert.equal(publicCategories.get("mechanics")?.dynamicCount, 1);
    assert.equal(publicCategories.get("mechanics")?.count, 2);

    assert.equal(publicCategories.get("algebra")?.builtinCount, 0);
    assert.equal(publicCategories.get("algebra")?.dynamicCount, 1);

    const publicGroups = new Map((publicData.groups || []).map((group) => [group.id, group]));
    assert.equal(publicGroups.has("physics"), true);
    assert.equal(publicGroups.has("math"), true);
    assert.equal(publicGroups.has("ghost"), false);
    assert.equal(publicGroups.get("physics")?.count, 3);
    assert.equal(publicGroups.get("math")?.count, 1);

    const token = await login(baseUrl, authConfig);
    const adminRes = await fetch(`${baseUrl}/api/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(adminRes.status, 200);
    const adminData = await adminRes.json();

    const adminCategories = new Map((adminData.categories || []).map((category) => [category.id, category]));
    assert.equal(adminCategories.has("mechanics"), true);
    assert.equal(adminCategories.has("algebra"), true);
    assert.equal(adminCategories.has("customx"), true);
    assert.equal(adminCategories.has("hiddencat"), true);
    assert.equal(adminCategories.has("ghostcat"), true);
    assert.equal(adminCategories.has("emptyonly"), true);

    assert.equal(adminCategories.get("mechanics")?.builtinCount, 1);
    assert.equal(adminCategories.get("mechanics")?.dynamicCount, 3);
    assert.equal(adminCategories.get("mechanics")?.count, 4);

    assert.equal(adminCategories.get("hiddencat")?.hidden, true);
    assert.equal(adminCategories.get("hiddencat")?.dynamicCount, 1);
    assert.equal(adminCategories.get("ghostcat")?.groupId, "ghost");

    assert.equal(adminCategories.get("emptyonly")?.count, 0);
    assert.equal(adminCategories.get("emptyonly")?.builtinCount, 0);
    assert.equal(adminCategories.get("emptyonly")?.dynamicCount, 0);

    const adminGroups = new Map((adminData.groups || []).map((group) => [group.id, group]));
    assert.equal(adminGroups.has("ghost"), true);
    assert.equal(adminGroups.get("ghost")?.hidden, true);
    assert.equal(adminGroups.get("ghost")?.count, 1);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
