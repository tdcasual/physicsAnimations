const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createApp } = require("../server/app");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");
const { startServer, stopServer } = require("./helpers/testServer");

test("root routes serve SPA entry and static assets", async () => {
  const rootDir = makeTempRoot({
    prefix: "pa-spa-test-",
    animationsJson: "{}",
    withAssets: false,
  });
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
    removeTempRoot(rootDir);
  }
});

test("legacy frontend entry points are treated as SPA routes", async () => {
  const rootDir = makeTempRoot({
    prefix: "pa-spa-test-",
    animationsJson: "{}",
    withAssets: false,
  });
  const spaDist = path.join(rootDir, "frontend", "dist");
  fs.mkdirSync(path.join(spaDist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(spaDist, "index.html"), "<!doctype html><title>cutover</title>");
  fs.writeFileSync(path.join(spaDist, "assets", "main.js"), "console.log('main');");

  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);
  try {
    const urls = [
      "/index.html",
      "/viewer.html",
      "/app",
      "/app/",
      "/app/viewer/demo",
      "/animations.json",
      "/animations/mechanics/demo.html",
    ];
    for (const urlPath of urls) {
      const response = await fetch(`${baseUrl}${urlPath}`);
      assert.equal(response.status, 200, `${urlPath} should resolve to SPA entry`);
      assert.match(await response.text(), /cutover/);
    }
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});

test("returns service_unavailable when SPA dist is missing", async () => {
  const rootDir = makeTempRoot({
    prefix: "pa-spa-test-",
    animationsJson: "{}",
    withAssets: false,
  });
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
    removeTempRoot(rootDir);
  }
});

test("serves SPA entry for extension-like root paths", async () => {
  const rootDir = makeTempRoot({
    prefix: "pa-spa-test-",
    animationsJson: "{}",
    withAssets: false,
  });
  const spaDist = path.join(rootDir, "frontend", "dist");
  fs.mkdirSync(path.join(spaDist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(spaDist, "index.html"), "<!doctype html><title>root-spa</title>");

  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);
  try {
    const robots = await fetch(`${baseUrl}/robots.txt`);
    assert.equal(robots.status, 200);
    assert.match(await robots.text(), /root-spa/);
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});

test("serves SPA entry for nested extension-like paths", async () => {
  const rootDir = makeTempRoot({
    prefix: "pa-spa-test-",
    animationsJson: "{}",
    withAssets: false,
  });
  const spaDist = path.join(rootDir, "frontend", "dist");
  fs.mkdirSync(path.join(spaDist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(spaDist, "index.html"), "<!doctype html><title>root-spa</title>");

  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);
  try {
    const routes = ["/foo/bar.js", "/foo/bar/baz.css", "/foo/bar/baz.map"];
    for (const urlPath of routes) {
      const response = await fetch(`${baseUrl}${urlPath}`);
      assert.equal(response.status, 200, `${urlPath} should resolve to SPA entry`);
      assert.match(await response.text(), /root-spa/);
    }

    const viewerLike = await fetch(`${baseUrl}/viewer/${encodeURIComponent("mechanics/demo.html")}`);
    assert.equal(viewerLike.status, 200);
    assert.match(await viewerLike.text(), /root-spa/);
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});
