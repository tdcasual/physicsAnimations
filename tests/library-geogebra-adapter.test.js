const test = require("node:test");
const assert = require("node:assert/strict");

test("createGeogebraAdapter matches .ggb files only", async () => {
  const { createGeogebraAdapter } = require("../server/services/library/adapters/geogebra");

  const adapter = createGeogebraAdapter();
  assert.equal(typeof adapter.match, "function");
  assert.equal(adapter.match({ fileName: "demo.ggb" }), true);
  assert.equal(adapter.match({ fileName: "DEMO.GGB" }), true);
  assert.equal(adapter.match({ fileName: "demo.zip" }), false);
  assert.equal(adapter.match({ fileName: "" }), false);
});

test("createGeogebraAdapter builds viewer html for embed mode", async () => {
  const { createGeogebraAdapter } = require("../server/services/library/adapters/geogebra");
  const adapter = createGeogebraAdapter();

  const out = await adapter.buildViewer({
    openMode: "embed",
    assetPublicFileUrl: "/content/library/assets/a1/source/demo.ggb",
    title: "Demo",
  });

  assert.equal(out.generated, true);
  assert.equal(typeof out.html, "string");
  assert.match(out.html, /deployggb\.js/);
  assert.match(out.html, /content\/library\/assets\/a1\/source\/demo\.ggb/);
});

test("createGeogebraAdapter skips viewer generation in download mode", async () => {
  const { createGeogebraAdapter } = require("../server/services/library/adapters/geogebra");
  const adapter = createGeogebraAdapter();

  const out = await adapter.buildViewer({
    openMode: "download",
    assetPublicFileUrl: "/content/library/assets/a1/source/demo.ggb",
  });

  assert.equal(out.generated, false);
  assert.equal(out.html, "");
});
