const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-catalog-sql-"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>test</title>");
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
    jwtSecret: "catalog-sql-test-secret",
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

test("/api/catalog uses SQL-backed dynamic loader when available", async () => {
  const rootDir = makeTempRoot();

  let sqlCalls = 0;
  const store = {
    async readBuffer(key) {
      const normalized = String(key || "").replace(/^\/+/, "");
      if (normalized === "items.json") return Buffer.from('{"version":2,"items":[]}\n', "utf8");
      if (normalized === "builtin_items.json") return Buffer.from('{"version":1,"items":{}}\n', "utf8");
      if (normalized === "categories.json") {
        return Buffer.from(
          `${JSON.stringify(
            {
              version: 2,
              groups: {
                math: { id: "math", title: "数学", order: 5, hidden: false },
              },
              categories: {
                algebra: { id: "algebra", groupId: "math", title: "代数", order: 3, hidden: false },
              },
            },
            null,
            2,
          )}\n`,
          "utf8",
        );
      }
      return null;
    },
    stateDbQuery: {
      async queryDynamicItemsForCatalog(options = {}) {
        sqlCalls += 1;
        assert.equal(options.includeHiddenItems, false);
        assert.equal(options.includeUnpublishedItems, false);
        return {
          items: [
            {
              id: "dyn_mechanics_public",
              type: "link",
              categoryId: "mechanics",
              title: "Mechanics Public",
              description: "",
              url: "https://example.com/public",
              thumbnail: "",
              order: 0,
              published: true,
              hidden: false,
              createdAt: "2026-01-03T00:00:00.000Z",
              updatedAt: "2026-01-03T00:00:00.000Z",
              uploadKind: "html",
            },
            {
              id: "dyn_mechanics_hidden",
              type: "link",
              categoryId: "mechanics",
              title: "Mechanics Hidden",
              description: "",
              url: "https://example.com/hidden",
              thumbnail: "",
              order: 0,
              published: true,
              hidden: true,
              createdAt: "2026-01-02T00:00:00.000Z",
              updatedAt: "2026-01-02T00:00:00.000Z",
              uploadKind: "html",
            },
            {
              id: "dyn_mechanics_unpublished",
              type: "link",
              categoryId: "mechanics",
              title: "Mechanics Unpublished",
              description: "",
              url: "https://example.com/unpublished",
              thumbnail: "",
              order: 0,
              published: false,
              hidden: false,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
              uploadKind: "html",
            },
            {
              id: "dyn_algebra",
              type: "upload",
              categoryId: "algebra",
              title: "Algebra Upload",
              description: "",
              path: "content/uploads/dyn_algebra/index.html",
              thumbnail: "",
              order: 0,
              published: true,
              hidden: false,
              createdAt: "2026-01-04T00:00:00.000Z",
              updatedAt: "2026-01-04T00:00:00.000Z",
              uploadKind: "zip",
            },
          ],
        };
      },
    },
  };

  const app = createApp({ rootDir, authConfig: makeAuthConfig(), store });
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/catalog`);
    assert.equal(response.status, 200);
    const data = await response.json();

    assert.equal(sqlCalls, 1);

    assert.ok(data?.groups?.physics?.categories?.mechanics);
    const mechanicsItems = data.groups.physics.categories.mechanics.items || [];
    const mechanicsIds = new Set(mechanicsItems.map((item) => item.id));
    assert.equal(mechanicsIds.has("mechanics/demo.html"), true);
    assert.equal(mechanicsIds.has("dyn_mechanics_public"), true);
    assert.equal(mechanicsIds.has("dyn_mechanics_hidden"), false);
    assert.equal(mechanicsIds.has("dyn_mechanics_unpublished"), false);
    const builtIn = mechanicsItems.find((item) => item.id === "mechanics/demo.html");
    assert.equal(builtIn?.href, "/viewer/mechanics%2Fdemo.html");
    const dynamicPublic = mechanicsItems.find((item) => item.id === "dyn_mechanics_public");
    assert.equal(dynamicPublic?.href, "/viewer/dyn_mechanics_public");

    assert.ok(data?.groups?.math?.categories?.algebra);
    assert.equal(data.groups.math.title, "数学");
    assert.equal(data.groups.math.categories.algebra.title, "代数");
    const algebraItems = data.groups.math.categories.algebra.items || [];
    const algebraIds = new Set(algebraItems.map((item) => item.id));
    assert.equal(algebraIds.has("dyn_algebra"), true);
    const dynamicAlgebra = algebraItems.find((item) => item.id === "dyn_algebra");
    assert.equal(dynamicAlgebra?.href, "/viewer/dyn_algebra");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
