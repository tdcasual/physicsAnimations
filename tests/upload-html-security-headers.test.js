const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");

const { createApp } = require("../server/app");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");
const { startServer, stopServer } = require("./helpers/testServer");

function createStore() {
  return {
    mode: "webdav",
    async createReadStream(key) {
      if (key === "uploads/demo/index.html") {
        return Readable.from(["<html><body>demo</body></html>"]);
      }
      if (key === "uploads/demo/app.js") {
        return Readable.from(["console.log('demo');"]);
      }
      return null;
    },
    async readBuffer() {
      return Buffer.from("{}");
    },
    async writeBuffer() {},
    async deletePath() {},
  };
}

test("isolated upload html route adds sandbox CSP while raw route stays direct-open", async () => {
  const rootDir = makeTempRoot({ prefix: "pa-upload-isolated-" });
  const app = createApp({ rootDir, store: createStore() });
  const { server, baseUrl } = await startServer(app);

  try {
    const isolatedRes = await fetch(`${baseUrl}/content/isolated/uploads/demo/index.html`);
    assert.equal(isolatedRes.status, 200);
    assert.match(isolatedRes.headers.get("content-type") || "", /text\/html/i);
    assert.equal(isolatedRes.headers.get("content-security-policy"), "sandbox allow-scripts");
    assert.equal(isolatedRes.headers.get("x-content-type-options"), "nosniff");
    assert.equal(isolatedRes.headers.get("referrer-policy"), "no-referrer");
    assert.equal(isolatedRes.headers.get("cache-control"), "no-store");

    const rawRes = await fetch(`${baseUrl}/content/uploads/demo/index.html`);
    assert.equal(rawRes.status, 200);
    assert.equal(rawRes.headers.get("content-security-policy"), null);
    assert.equal(rawRes.headers.get("x-content-type-options"), "nosniff");
    assert.equal(rawRes.headers.get("referrer-policy"), "no-referrer");
    assert.equal(rawRes.headers.get("cache-control"), "no-store");
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});
