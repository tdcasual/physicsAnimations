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

test("spa default entry serves / and rewrites legacy viewer path", async () => {
  const rootDir = makeTempRoot();
  const spaDist = path.join(rootDir, "frontend", "dist");
  fs.mkdirSync(path.join(spaDist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(spaDist, "index.html"), "<!doctype html><title>new-default</title>");

  const app = createApp({ rootDir, spaDefaultEntry: true });
  const { server, baseUrl } = await startServer(app);
  try {
    const home = await fetch(`${baseUrl}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /new-default/);

    const index = await fetch(`${baseUrl}/index.html`);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /new-default/);

    const legacyViewer = await fetch(`${baseUrl}/viewer.html?id=demo-1`, { redirect: "manual" });
    assert.equal(legacyViewer.status, 302);
    assert.equal(legacyViewer.headers.get("location"), "/app/viewer/demo-1");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("spa defaults to serving / from SPA dist when available", async () => {
  const rootDir = makeTempRoot();
  const spaDist = path.join(rootDir, "frontend", "dist");
  fs.mkdirSync(path.join(spaDist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(spaDist, "index.html"), "<!doctype html><title>new-default-auto</title>");

  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);
  try {
    const home = await fetch(`${baseUrl}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /new-default-auto/);

    const legacyViewer = await fetch(`${baseUrl}/viewer.html?id=demo-2`, { redirect: "manual" });
    assert.equal(legacyViewer.status, 302);
    assert.equal(legacyViewer.headers.get("location"), "/app/viewer/demo-2");
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("spa default entry falls back to legacy pages when spa dist is missing", async () => {
  const rootDir = makeTempRoot();
  const app = createApp({ rootDir, spaDefaultEntry: true });
  const { server, baseUrl } = await startServer(app);
  try {
    const home = await fetch(`${baseUrl}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /legacy/);

    const viewer = await fetch(`${baseUrl}/viewer.html`);
    assert.equal(viewer.status, 200);
    assert.match(await viewer.text(), /viewer/);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("spa default entry can be disabled explicitly even when dist exists", async () => {
  const rootDir = makeTempRoot();
  const spaDist = path.join(rootDir, "frontend", "dist");
  fs.mkdirSync(path.join(spaDist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(spaDist, "index.html"), "<!doctype html><title>new-dist</title>");

  const app = createApp({ rootDir, spaDefaultEntry: false });
  const { server, baseUrl } = await startServer(app);
  try {
    const home = await fetch(`${baseUrl}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /legacy/);

    const viewer = await fetch(`${baseUrl}/viewer.html?id=demo-3`, { redirect: "manual" });
    assert.equal(viewer.status, 200);
    assert.match(await viewer.text(), /viewer/);

    const appEntry = await fetch(`${baseUrl}/app`);
    assert.equal(appEntry.status, 200);
    assert.match(await appEntry.text(), /new-dist/);
  } finally {
    await stopServer(server);
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
