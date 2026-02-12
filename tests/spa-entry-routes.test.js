const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-spa-test-"));
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(path.join(root, "animations.json"), "{}");
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>legacy</title>");
  fs.writeFileSync(path.join(root, "viewer.html"), "<!doctype html><title>viewer</title>");
  return root;
}

async function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

async function stopServer(server) {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}

test("/app routes serve SPA entry and static assets", async () => {
  const rootDir = makeTempRoot();
  const spaDist = path.join(rootDir, "frontend", "dist");
  fs.mkdirSync(path.join(spaDist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(spaDist, "index.html"), "<!doctype html><title>new-spa</title>");
  fs.writeFileSync(path.join(spaDist, "assets", "app.js"), "console.log('ok');");

  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);
  try {
    const entry = await fetch(`${baseUrl}/app`);
    assert.equal(entry.status, 200);
    assert.match(await entry.text(), /new-spa/);

    const nested = await fetch(`${baseUrl}/app/viewer/abc`);
    assert.equal(nested.status, 200);
    assert.match(await nested.text(), /new-spa/);

    const asset = await fetch(`${baseUrl}/app/assets/app.js`);
    assert.equal(asset.status, 200);
    assert.equal(await asset.text(), "console.log('ok');");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
