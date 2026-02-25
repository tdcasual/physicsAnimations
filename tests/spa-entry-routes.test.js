const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createApp } = require("../server/app");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-spa-test-"));
  fs.mkdirSync(path.join(root, "animations"), { recursive: true });
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  fs.writeFileSync(path.join(root, "animations.json"), "{}");
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

test("root routes serve SPA entry and static assets", async () => {
  const rootDir = makeTempRoot();
  const spaDist = path.join(rootDir, "frontend", "dist");
  fs.mkdirSync(path.join(spaDist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(spaDist, "index.html"), "<!doctype html><title>root-spa</title>");
  fs.writeFileSync(path.join(spaDist, "assets", "app.js"), "console.log('ok');");

  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);
  try {
    const entry = await fetch(`${baseUrl}/`);
    assert.equal(entry.status, 200);
    assert.match(await entry.text(), /root-spa/);

    const nested = await fetch(`${baseUrl}/viewer/abc`);
    assert.equal(nested.status, 200);
    assert.match(await nested.text(), /root-spa/);

    const admin = await fetch(`${baseUrl}/admin/dashboard`);
    assert.equal(admin.status, 200);
    assert.match(await admin.text(), /root-spa/);

    const asset = await fetch(`${baseUrl}/assets/app.js`);
    assert.equal(asset.status, 200);
    assert.equal(await asset.text(), "console.log('ok');");

    const apiHealth = await fetch(`${baseUrl}/api/health`);
    assert.equal(apiHealth.status, 200);
    const health = await apiHealth.json();
    assert.equal(health.ok, true);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("legacy frontend entry points return not_found", async () => {
  const rootDir = makeTempRoot();
  const spaDist = path.join(rootDir, "frontend", "dist");
  fs.mkdirSync(path.join(spaDist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(spaDist, "index.html"), "<!doctype html><title>cutover</title>");
  fs.writeFileSync(path.join(spaDist, "assets", "main.js"), "console.log('main');");

  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);
  try {
    const urls = ["/index.html", "/viewer.html", "/app", "/app/", "/app/viewer/demo"];
    for (const urlPath of urls) {
      const response = await fetch(`${baseUrl}${urlPath}`);
      assert.equal(response.status, 404, `${urlPath} should be 404`);
      const payload = await response.json();
      assert.equal(payload.error, "not_found", `${urlPath} should return not_found`);
    }
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("returns service_unavailable when SPA dist is missing", async () => {
  const rootDir = makeTempRoot();
  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);
  try {
    const home = await fetch(`${baseUrl}/`);
    assert.equal(home.status, 503);
    assert.deepEqual(await home.json(), { error: "service_unavailable" });

    const viewerRoute = await fetch(`${baseUrl}/viewer/demo-3`);
    assert.equal(viewerRoute.status, 503);
    assert.deepEqual(await viewerRoute.json(), { error: "service_unavailable" });

    const apiHealth = await fetch(`${baseUrl}/api/health`);
    assert.equal(apiHealth.status, 200);
    const health = await apiHealth.json();
    assert.equal(health.ok, true);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
