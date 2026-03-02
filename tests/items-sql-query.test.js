const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");

function makeTempRoot({ animationsJson } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-items-sql-"));
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
              title: "Legacy Demo",
              description: "legacy",
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
    jwtSecret: "items-sql-secret",
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
  await new Promise((resolve) => { server.close(resolve); });
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

test("/api/items uses SQL-backed dynamic query when state db enabled", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();

  writeItems(rootDir, [
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
    {
      id: "u_hidden_1",
      type: "upload",
      categoryId: "other",
      path: "content/uploads/u_hidden_1/index.html",
      title: "Hidden Upload",
      description: "beta",
      thumbnail: "",
      order: 0,
      published: true,
      hidden: true,
      uploadKind: "zip",
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
    {
      id: "l_unpublished_1",
      type: "link",
      categoryId: "other",
      url: "https://example.com/private",
      title: "Private Link",
      description: "gamma",
      thumbnail: "",
      order: 0,
      published: false,
      hidden: false,
      uploadKind: "html",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ]);

  const app = createApp({
    rootDir,
    authConfig,
    stateDbMode: "sqlite",
    stateDbPath: path.join(rootDir, "content", "state.sqlite"),
  });
  const { server, baseUrl } = await startServer(app);

  try {
    const publicRes = await fetch(`${baseUrl}/api/items?page=1&pageSize=50`);
    assert.equal(publicRes.status, 200);
    const publicData = await publicRes.json();

    const publicIds = new Set((publicData.items || []).map((it) => it.id));
    assert.equal(publicIds.has("l_public_1"), true);
    assert.equal(publicIds.has("u_hidden_1"), false);
    assert.equal(publicIds.has("l_unpublished_1"), false);

    const token = await login(baseUrl, authConfig);
    const adminRes = await fetch(`${baseUrl}/api/items?page=1&pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(adminRes.status, 200);
    const adminData = await adminRes.json();

    const adminIds = new Set((adminData.items || []).map((it) => it.id));
    assert.equal(adminIds.has("l_public_1"), true);
    assert.equal(adminIds.has("u_hidden_1"), true);
    assert.equal(adminIds.has("l_unpublished_1"), true);

    const searchRes = await fetch(`${baseUrl}/api/items?page=1&pageSize=50&q=public`);
    assert.equal(searchRes.status, 200);
    const searchData = await searchRes.json();
    const searchIds = new Set((searchData.items || []).map((it) => it.id));
    assert.equal(searchIds.has("l_public_1"), true);
    assert.equal(searchIds.has("u_hidden_1"), false);

    const detailPublicRes = await fetch(`${baseUrl}/api/items/l_public_1`);
    assert.equal(detailPublicRes.status, 200);
    const detailPublicData = await detailPublicRes.json();
    assert.equal(detailPublicData?.item?.id, "l_public_1");

    const detailHiddenPublicRes = await fetch(`${baseUrl}/api/items/u_hidden_1`);
    assert.equal(detailHiddenPublicRes.status, 404);

    const detailUnpublishedPublicRes = await fetch(`${baseUrl}/api/items/l_unpublished_1`);
    assert.equal(detailUnpublishedPublicRes.status, 404);

    const detailHiddenAdminRes = await fetch(`${baseUrl}/api/items/u_hidden_1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(detailHiddenAdminRes.status, 200);
    const detailHiddenAdminData = await detailHiddenAdminRes.json();
    assert.equal(detailHiddenAdminData?.item?.id, "u_hidden_1");

    const detailUnpublishedAdminRes = await fetch(`${baseUrl}/api/items/l_unpublished_1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(detailUnpublishedAdminRes.status, 200);
    const detailUnpublishedAdminData = await detailUnpublishedAdminRes.json();
    assert.equal(detailUnpublishedAdminData?.item?.id, "l_unpublished_1");

    const missingLegacyRes = await fetch(`${baseUrl}/api/items/${encodeURIComponent("legacy/demo.html")}`);
    assert.equal(missingLegacyRes.status, 404);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("/api/items uses SQL-backed query by default when state db mode is not set", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();

  writeItems(rootDir, [
    {
      id: "default_sql_item_1",
      type: "link",
      categoryId: "other",
      url: "https://example.com/default-sql",
      title: "Default SQL",
      description: "default",
      thumbnail: "",
      order: 0,
      published: true,
      hidden: false,
      uploadKind: "html",
      createdAt: "2026-01-03T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
    },
  ]);

  const app = createApp({
    rootDir,
    authConfig,
    stateDbPath: path.join(rootDir, "content", "state.sqlite"),
  });
  const { server, baseUrl } = await startServer(app);

  try {
    const listRes = await fetch(`${baseUrl}/api/items?page=1&pageSize=10`);
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(Array.isArray(listData?.items), true);
    assert.equal(listData.items.some((item) => item.id === "default_sql_item_1"), true);

    const detailRes = await fetch(`${baseUrl}/api/items/default_sql_item_1`);
    assert.equal(detailRes.status, 200);
    const detailData = await detailRes.json();
    assert.equal(detailData?.item?.id, "default_sql_item_1");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
