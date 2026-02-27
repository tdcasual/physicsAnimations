const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");

test("createApp uses injected queryRepos for /api/items", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-app-repos-"));
  fs.mkdirSync(path.join(rootDir, "assets"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "animations"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "frontend", "dist", "assets"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "frontend", "dist", "index.html"), "<!doctype html><title>ok</title>");
  fs.writeFileSync(path.join(rootDir, "animations.json"), "{}\n");

  const app = createApp({
    rootDir,
    authConfig: {
      adminUsername: "admin",
      adminPasswordHash: bcrypt.hashSync("secret", 10),
      jwtSecret: "x",
      jwtIssuer: "physicsAnimations",
      jwtAudience: "physicsAnimations-web",
      tokenTtlSeconds: 3600,
    },
    store: {
      mode: "local",
      readOnly: false,
      async readBuffer() {
        return null;
      },
      async writeBuffer() {},
      async deletePath() {},
      async createReadStream() {
        return null;
      },
    },
    queryRepos: {
      itemsQueryRepo: {
        async queryItems() {
          return {
            total: 1,
            items: [
              {
                id: "from_repo",
                type: "link",
                categoryId: "other",
                title: "X",
                description: "",
                url: "",
                thumbnail: "",
                order: 0,
                published: true,
                hidden: false,
                createdAt: "",
                updatedAt: "",
              },
            ],
          };
        },
      },
      taxonomyQueryRepo: {
        async queryDynamicCategoryCounts() {
          return { byCategory: {} };
        },
        async queryDynamicItemsForCatalog() {
          return { items: [] };
        },
      },
    },
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });

  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/items?page=1&pageSize=10`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.items[0].id, "from_repo");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
