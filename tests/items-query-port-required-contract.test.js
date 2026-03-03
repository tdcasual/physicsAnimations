const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../server/app");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");
const { startServer, stopServer } = require("./helpers/testServer");

test("/api/items returns state_db_unavailable when queryItems port is missing", async () => {
  const rootDir = makeTempRoot({ prefix: "pa-items-query-port-required-" });

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
      async queryDynamicItems() {
        return { total: 1, items: [] };
      },
    },
  };

  const app = createApp({ rootDir, store });
  const { server, baseUrl } = await startServer(app);

  try {
    const res = await fetch(`${baseUrl}/api/items?page=1&pageSize=5&q=demo`);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: "state_db_unavailable" });
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});
