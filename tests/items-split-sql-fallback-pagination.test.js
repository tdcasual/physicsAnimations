const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-items-split-fallback-"));
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(path.join(root, "animations.json"), "{}\n");
  return root;
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

test("/api/items keeps page offset when dynamic SQL path falls back to in-memory", async () => {
  const rootDir = makeTempRoot();

  const store = {
    async readBuffer(key) {
      const normalized = String(key || "").replace(/^\/+/, "");
      if (normalized === "items.json") {
        return Buffer.from(
          JSON.stringify({
            version: 2,
            items: [
              {
                id: "dyn-1",
                type: "link",
                categoryId: "other",
                title: "Dynamic 1",
                description: "",
                url: "https://example.com/1",
                thumbnail: "",
                order: 0,
                published: true,
                hidden: false,
                uploadKind: "html",
                createdAt: "2026-01-03T00:00:00.000Z",
                updatedAt: "2026-01-03T00:00:00.000Z",
              },
              {
                id: "dyn-2",
                type: "link",
                categoryId: "other",
                title: "Dynamic 2",
                description: "",
                url: "https://example.com/2",
                thumbnail: "",
                order: 0,
                published: true,
                hidden: false,
                uploadKind: "html",
                createdAt: "2026-01-02T00:00:00.000Z",
                updatedAt: "2026-01-02T00:00:00.000Z",
              },
              {
                id: "dyn-3",
                type: "link",
                categoryId: "other",
                title: "Dynamic 3",
                description: "",
                url: "https://example.com/3",
                thumbnail: "",
                order: 0,
                published: true,
                hidden: false,
                uploadKind: "html",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          }),
          "utf8",
        );
      }
      return null;
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      return null;
    },
    stateDbQuery: {
      async queryDynamicItems() {
        throw new Error("no such table: state_dynamic_items");
      },
      async queryBuiltinItems({ limit }) {
        return { total: 0, items: limit > 0 ? [] : [] };
      },
    },
  };

  const app = createApp({ rootDir, store });
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/items?page=2&pageSize=2`);
    assert.equal(response.status, 200);
    const data = await response.json();

    const ids = (data.items || []).map((item) => item.id);
    assert.deepEqual(ids, ["dyn-3"]);
    assert.equal(data.total, 3);
    assert.equal(data.page, 2);
    assert.equal(data.pageSize, 2);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
