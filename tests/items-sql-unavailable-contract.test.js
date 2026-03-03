const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../server/app");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");
const { startServer, stopServer } = require("./helpers/testServer");

test("/api/items returns state_db_unavailable when items SQL query port fails", async () => {
  const rootDir = makeTempRoot({ prefix: "pa-items-sql-unavailable-" });

  const store = {
    async readBuffer(key) {
      const normalized = String(key || "").replace(/^\/+/, "");
      if (normalized === "items.json") {
        return Buffer.from(
          JSON.stringify(
            {
              version: 2,
              items: [
                {
                  id: "fallback_item_should_not_be_used",
                  type: "link",
                  categoryId: "other",
                  title: "Fallback Item",
                  description: "",
                  thumbnail: "",
                  createdAt: "2026-03-03T00:00:00.000Z",
                  updatedAt: "2026-03-03T00:00:00.000Z",
                  order: 0,
                  published: true,
                  hidden: false,
                  uploadKind: "html",
                  url: "https://example.com/fallback-item",
                },
              ],
            },
            null,
            2,
          ),
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
      async queryItems() {
        throw new Error("no such table: state_dynamic_items");
      },
    },
  };

  const app = createApp({ rootDir, store });
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/items?page=1&pageSize=2`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "state_db_unavailable" });
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});
