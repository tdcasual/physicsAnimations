const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-items-builtin-sql-"));
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

test("/api/items uses SQL builtin query branch when available", async () => {
  const rootDir = makeTempRoot();

  let dynamicCall = null;
  let builtinCall = null;

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
      async queryDynamicItems(options = {}) {
        dynamicCall = options;
        return {
          total: 1,
          items: [
            {
              id: "dyn_1",
              type: "link",
              categoryId: "other",
              title: "Dynamic Demo",
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
          ],
        };
      },
      async queryBuiltinItems(options = {}) {
        builtinCall = options;
        return {
          total: 2,
          items: [
            {
              id: "builtin_a",
              type: "builtin",
              categoryId: "other",
              title: "Builtin A",
              description: "",
              thumbnail: "",
              order: 0,
              published: true,
              hidden: false,
              deleted: false,
              createdAt: "",
              updatedAt: "",
            },
            {
              id: "builtin_b",
              type: "builtin",
              categoryId: "other",
              title: "Builtin B",
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
    },
  };

  const app = createApp({ rootDir, store });
  const { server, baseUrl } = await startServer(app);

  try {
    const res = await fetch(`${baseUrl}/api/items?page=1&pageSize=5&q=demo`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(dynamicCall);
    assert.equal(dynamicCall.q, "demo");
    assert.equal(dynamicCall.offset, 0);
    assert.equal(dynamicCall.limit, 5);

    assert.ok(builtinCall);
    assert.equal(builtinCall.q, "demo");
    assert.equal(builtinCall.offset, 0);
    assert.equal(builtinCall.limit, 4);
    assert.equal(builtinCall.includeDeleted, false);
    assert.equal(builtinCall.isAdmin, false);

    const ids = (data.items || []).map((it) => it.id);
    assert.deepEqual(ids, ["dyn_1", "builtin_a", "builtin_b"]);
    assert.equal(data.total, 3);
    assert.equal(data.page, 1);
    assert.equal(data.pageSize, 5);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
