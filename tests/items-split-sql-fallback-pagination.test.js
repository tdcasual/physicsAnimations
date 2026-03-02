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

test("/api/items returns state_db_unavailable when merged SQL query fails", async () => {
  const rootDir = makeTempRoot();

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
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
