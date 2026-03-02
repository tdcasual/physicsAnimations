const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../server/app");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");
const { startServer, stopServer } = require("./helpers/testServer");

test("/api/items returns state_db_unavailable when items query port fails", async () => {
  const rootDir = makeTempRoot({ prefix: "pa-items-sql-unavailable-" });

  const store = {
    async readBuffer() {
      throw new Error("readBuffer should not be called");
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      return null;
    },
    stateDbQuery: {
      async queryItems() {
        throw new Error("no such table: state_dynamic_items");
      },
    },
  };

  const app = createApp({ rootDir, store });
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/items?page=2&pageSize=2`);
    assert.equal(response.status, 503);
    const data = await response.json();
    assert.equal(data?.error, "state_db_unavailable");
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});
