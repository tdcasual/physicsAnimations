const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createApp } = require("../server/app");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");
const { startServer, stopServer } = require("./helpers/testServer");

test("legacy hard-cut routes stay blocked while valid SPA routes still resolve", async () => {
  const rootDir = makeTempRoot({
    prefix: "pa-spa-hardcut-",
    animationsJson: "{}",
    withAssets: false,
  });

  const spaDist = path.join(rootDir, "frontend", "dist");
  fs.mkdirSync(path.join(spaDist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(spaDist, "index.html"), "<!doctype html><title>hardcut</title>");

  const app = createApp({ rootDir });
  const { server, baseUrl } = await startServer(app);

  try {
    const blocked = [
      "/index.html",
      "/viewer.html",
      "/app",
      "/app/catalog",
      "/animations.json",
      "/animations/demo.html",
    ];

    for (const p of blocked) {
      const res = await fetch(`${baseUrl}${p}`);
      assert.equal(res.status, 404, `${p} should be hard-cut`);
      assert.deepEqual(await res.json(), { error: "not_found" });
    }

    const allowed = await fetch(`${baseUrl}/viewer/demo-item`);
    assert.equal(allowed.status, 200);
    assert.match(await allowed.text(), /hardcut/);
  } finally {
    await stopServer(server);
    removeTempRoot(rootDir);
  }
});
