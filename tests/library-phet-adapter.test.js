const test = require("node:test");
const assert = require("node:assert/strict");

test("createPhETAdapter matches phet html by file name", async () => {
  const { createPhETAdapter } = require("../server/services/library/adapters/phet");

  const adapter = createPhETAdapter();
  assert.equal(typeof adapter.match, "function");
  assert.equal(adapter.match({ fileName: "projectile-motion.phet.html" }), true);
  assert.equal(adapter.match({ fileName: "projectile-motion.phet.htm" }), true);
  assert.equal(adapter.match({ fileName: "demo.ggb" }), false);
});

test("createPhETAdapter can detect phet html by content markers", async () => {
  const { createPhETAdapter } = require("../server/services/library/adapters/phet");
  const adapter = createPhETAdapter();

  const buf = Buffer.from(
    "<html><script src=\"https://phet.colorado.edu/sims/html/gravity-force-lab/latest/gravity-force-lab_en.html\"></script></html>",
    "utf8",
  );
  assert.equal(adapter.match({ fileName: "gravity.html", fileBuffer: buf }), true);
});

test("createPhETAdapter builds iframe wrapper for embed mode", async () => {
  const { createPhETAdapter } = require("../server/services/library/adapters/phet");
  const adapter = createPhETAdapter();

  const out = await adapter.buildViewer({
    openMode: "embed",
    assetPublicFileUrl: "/content/library/assets/a1/source/projectile-motion.phet.html",
    title: "PhET Demo",
  });

  assert.equal(out.generated, true);
  assert.equal(typeof out.html, "string");
  assert.match(out.html, /iframe/);
  assert.match(out.html, /projectile-motion\.phet\.html/);
});

test("createPhETAdapter skips viewer generation for download mode", async () => {
  const { createPhETAdapter } = require("../server/services/library/adapters/phet");
  const adapter = createPhETAdapter();

  const out = await adapter.buildViewer({
    openMode: "download",
    assetPublicFileUrl: "/content/library/assets/a1/source/projectile-motion.phet.html",
  });

  assert.equal(out.generated, false);
  assert.equal(out.html, "");
});
