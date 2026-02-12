const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-item-detail-sql-"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>test</title>");
  fs.writeFileSync(path.join(root, "viewer.html"), "<!doctype html><title>viewer</title>");
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(path.join(root, "animations.json"), "{}\n");
  return root;
}

function makeAuthConfig() {
  return {
    adminUsername: "admin",
    adminPasswordHash: bcrypt.hashSync("secret", 10),
    jwtSecret: "item-detail-sql-secret",
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

test("/api/items/:id uses SQL detail lookup when available", async () => {
  const rootDir = makeTempRoot();
  const authConfig = makeAuthConfig();

  const dynamicLookupCalls = [];
  const builtinLookupCalls = [];
  const store = {
    async readBuffer(key) {
      const normalized = String(key || "").replace(/^\/+/, "");
      if (normalized === "items.json") return Buffer.from('{"version":2,"items":[]}\n', "utf8");
      if (normalized === "builtin_items.json") return Buffer.from('{"version":1,"items":{}}\n', "utf8");
      if (normalized === "categories.json") {
        return Buffer.from('{"version":2,"groups":{},"categories":{}}\n', "utf8");
      }
      return null;
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      return null;
    },
    stateDbQuery: {
      async queryDynamicItemById({ id, isAdmin }) {
        dynamicLookupCalls.push({ id, isAdmin });
        if (id === "sql_public") {
          return {
            id: "sql_public",
            type: "link",
            categoryId: "other",
            title: "SQL Public",
            description: "",
            url: "https://example.com/public",
            thumbnail: "",
            order: 0,
            published: true,
            hidden: false,
            uploadKind: "html",
            createdAt: "2026-01-03T00:00:00.000Z",
            updatedAt: "2026-01-03T00:00:00.000Z",
          };
        }

        if (id === "sql_hidden") {
          if (!isAdmin) return null;
          return {
            id: "sql_hidden",
            type: "upload",
            categoryId: "other",
            title: "SQL Hidden",
            description: "",
            path: "content/uploads/sql_hidden/index.html",
            thumbnail: "",
            order: 0,
            published: true,
            hidden: true,
            uploadKind: "zip",
            createdAt: "2026-01-02T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
          };
        }

        return null;
      },
      async queryBuiltinItemById({ id, isAdmin, includeDeleted }) {
        builtinLookupCalls.push({ id, isAdmin, includeDeleted });

        if (id === "builtin_public") {
          return {
            id: "builtin_public",
            type: "builtin",
            categoryId: "other",
            title: "Builtin Public",
            description: "",
            thumbnail: "",
            order: 0,
            published: true,
            hidden: false,
            deleted: false,
            createdAt: "",
            updatedAt: "2026-01-01T00:00:00.000Z",
          };
        }

        if (id === "builtin_hidden") {
          if (!isAdmin) return null;
          return {
            id: "builtin_hidden",
            type: "builtin",
            categoryId: "other",
            title: "Builtin Hidden",
            description: "",
            thumbnail: "",
            order: 0,
            published: true,
            hidden: true,
            deleted: false,
            createdAt: "",
            updatedAt: "2026-01-01T00:00:00.000Z",
          };
        }

        return null;
      },
    },
  };

  const app = createApp({ rootDir, authConfig, store });
  const { server, baseUrl } = await startServer(app);

  try {
    const publicRes = await fetch(`${baseUrl}/api/items/sql_public`);
    assert.equal(publicRes.status, 200);
    const publicData = await publicRes.json();
    assert.equal(publicData?.item?.id, "sql_public");

    const hiddenPublicRes = await fetch(`${baseUrl}/api/items/sql_hidden`);
    assert.equal(hiddenPublicRes.status, 404);

    const token = await login(baseUrl, authConfig);
    const hiddenAdminRes = await fetch(`${baseUrl}/api/items/sql_hidden`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(hiddenAdminRes.status, 200);
    const hiddenAdminData = await hiddenAdminRes.json();
    assert.equal(hiddenAdminData?.item?.id, "sql_hidden");

    const builtinPublicRes = await fetch(`${baseUrl}/api/items/builtin_public`);
    assert.equal(builtinPublicRes.status, 200);
    const builtinPublicData = await builtinPublicRes.json();
    assert.equal(builtinPublicData?.item?.id, "builtin_public");

    const builtinHiddenPublicRes = await fetch(`${baseUrl}/api/items/builtin_hidden`);
    assert.equal(builtinHiddenPublicRes.status, 404);

    const builtinHiddenAdminRes = await fetch(`${baseUrl}/api/items/builtin_hidden`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(builtinHiddenAdminRes.status, 200);
    const builtinHiddenAdminData = await builtinHiddenAdminRes.json();
    assert.equal(builtinHiddenAdminData?.item?.id, "builtin_hidden");

    assert.equal(dynamicLookupCalls.some((call) => call.id === "sql_public" && call.isAdmin === false), true);
    assert.equal(dynamicLookupCalls.some((call) => call.id === "sql_hidden" && call.isAdmin === false), true);
    assert.equal(dynamicLookupCalls.some((call) => call.id === "sql_hidden" && call.isAdmin === true), true);

    assert.equal(
      builtinLookupCalls.some((call) => call.id === "builtin_public" && call.isAdmin === false && call.includeDeleted === false),
      true,
    );
    assert.equal(
      builtinLookupCalls.some((call) => call.id === "builtin_hidden" && call.isAdmin === false && call.includeDeleted === false),
      true,
    );
    assert.equal(
      builtinLookupCalls.some((call) => call.id === "builtin_hidden" && call.isAdmin === true && call.includeDeleted === true),
      true,
    );
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
