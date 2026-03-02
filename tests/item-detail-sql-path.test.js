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
    jwtSecret: "item-detail-sql-secret",
    jwtIssuer: "physicsAnimations",
    jwtAudience: "physicsAnimations-web",
    tokenTtlSeconds: 3600,
  };
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
  const rootDir = makeTempRoot({ prefix: "pa-item-detail-sql-" });
  const authConfig = makeAuthConfig();

  const detailLookupCalls = [];
  const store = {
    async readBuffer(key) {
      const normalized = String(key || "").replace(/^\/+/, "");
      if (normalized === "items.json") return Buffer.from('{"version":2,"items":[]}\n', "utf8");
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
      async queryItemById({ id, isAdmin, includeDeleted }) {
        detailLookupCalls.push({ id, isAdmin, includeDeleted });
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

    assert.equal(detailLookupCalls.some((call) => call.id === "sql_public" && call.isAdmin === false), true);
    assert.equal(detailLookupCalls.some((call) => call.id === "sql_hidden" && call.isAdmin === false), true);
    assert.equal(detailLookupCalls.some((call) => call.id === "sql_hidden" && call.isAdmin === true), true);
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});
