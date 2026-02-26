const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-items-merged-sql-"));
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
  await new Promise((resolve) => server.close(resolve));
}

test("/api/items prefers merged SQL query when available", async () => {
  const rootDir = makeTempRoot();

  let mergedCall = null;
  let dynamicCalled = false;
  let builtinCalled = false;

  const store = {
    async readBuffer() {
      return null;
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      return null;
    },
    stateDbQuery: {
      async queryItems(options = {}) {
        mergedCall = options;
        return {
          total: 2,
          items: [
            {
              id: "dyn_merged_1",
              type: "link",
              categoryId: "other",
              title: "Merged Dynamic",
              description: "",
              url: "https://example.com/dyn",
              thumbnail: "",
              order: 0,
              published: true,
              hidden: false,
              uploadKind: "html",
              createdAt: "2026-01-03T00:00:00.000Z",
              updatedAt: "2026-01-03T00:00:00.000Z",
            },
            {
              id: "builtin_merged_1",
              type: "builtin",
              categoryId: "other",
              title: "Merged Builtin",
              description: "",
              thumbnail: "",
              order: 0,
              published: true,
              hidden: false,
              deleted: false,
              createdAt: "",
              updatedAt: "",
            },
          ],
        };
      },
      async queryDynamicItems() {
        dynamicCalled = true;
        return { total: 0, items: [] };
      },
      async queryBuiltinItems() {
        builtinCalled = true;
        return { total: 0, items: [] };
      },
    },
  };

  const app = createApp({ rootDir, store });
  const { server, baseUrl } = await startServer(app);

  try {
    const res = await fetch(`${baseUrl}/api/items?page=2&pageSize=5&q=merged&type=`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(mergedCall);
    assert.equal(mergedCall.q, "merged");
    assert.equal(mergedCall.page, undefined);
    assert.equal(mergedCall.offset, 5);
    assert.equal(mergedCall.limit, 5);
    assert.equal(mergedCall.includeDeleted, false);
    assert.equal(mergedCall.isAdmin, false);

    assert.equal(dynamicCalled, false);
    assert.equal(builtinCalled, false);

    const ids = (data.items || []).map((it) => it.id);
    assert.deepEqual(ids, ["dyn_merged_1", "builtin_merged_1"]);
    assert.equal(data.total, 2);
    assert.equal(data.page, 2);
    assert.equal(data.pageSize, 5);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
