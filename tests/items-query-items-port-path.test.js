const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../server/app");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");
const { startServer, stopServer } = require("./helpers/testServer");

test("/api/items uses queryItems port when available", async () => {
  const rootDir = makeTempRoot({ prefix: "pa-items-query-items-port-" });

  let queryCall = null;

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
        queryCall = options;
        return {
          total: 2,
          items: [
            {
              id: "dyn_query_1",
              type: "link",
              categoryId: "other",
              title: "Query Dynamic",
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
              id: "dyn_query_2",
              type: "upload",
              categoryId: "other",
              title: "Query Upload",
              description: "",
              path: "content/uploads/dyn_query_2/index.html",
              thumbnail: "",
              order: 0,
              published: true,
              hidden: false,
              uploadKind: "zip",
              createdAt: "2026-01-02T00:00:00.000Z",
              updatedAt: "2026-01-02T00:00:00.000Z",
            },
          ],
        };
      },
      async queryDynamicItems() {
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

    assert.ok(queryCall);
    assert.equal(queryCall.q, "merged");
    assert.equal(queryCall.page, undefined);
    assert.equal(queryCall.offset, 5);
    assert.equal(queryCall.limit, 5);
    assert.equal(queryCall.includeDeleted, false);
    assert.equal(queryCall.isAdmin, false);

    const ids = (data.items || []).map((it) => it.id);
    assert.deepEqual(ids, ["dyn_query_1", "dyn_query_2"]);
    assert.equal(data.total, 2);
    assert.equal(data.page, 2);
    assert.equal(data.pageSize, 5);
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});
