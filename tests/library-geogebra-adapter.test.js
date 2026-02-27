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
  assert.match(out.html, /content\/library\/vendor\/geogebra\/current\/deployggb\.js/);
  assert.match(out.html, /https:\/\/www\.geogebra\.org\/apps\/deployggb\.js/);
  assert.match(out.html, /setHTML5Codebase/);
  assert.match(out.html, /content\/library\/vendor\/geogebra\/current\/web3d\//);
  assert.match(out.html, /content\/library\/assets\/a1\/source\/demo\.ggb/);
});

test("createGeogebraAdapter supports custom self-host and fallback sources", async () => {
  const { createGeogebraAdapter } = require("../server/services/library/adapters/geogebra");
  const adapter = createGeogebraAdapter({
    selfHostedScriptUrl: "/content/vendor/geogebra/v1/deployggb.js",
    selfHostedHtml5Codebase: "/content/vendor/geogebra/v1/web3d/",
    onlineFallbackScriptUrl: "https://mirror.example.com/deployggb.js",
    onlineFallbackHtml5Codebase: "https://mirror.example.com/web3d/",
  });

  const out = await adapter.buildViewer({
    openMode: "embed",
    assetPublicFileUrl: "/content/library/assets/a1/source/demo.ggb",
    title: "Demo",
  });

  assert.equal(out.generated, true);
  assert.match(out.html, /content\/vendor\/geogebra\/v1\/deployggb\.js/);
  assert.match(out.html, /content\/vendor\/geogebra\/v1\/web3d\//);
  assert.match(out.html, /https:\/\/mirror\.example\.com\/deployggb\.js/);
  assert.match(out.html, /https:\/\/mirror\.example\.com\/web3d\//);
});

test("createGeogebraAdapter can disable online fallback", async () => {
  const { createGeogebraAdapter } = require("../server/services/library/adapters/geogebra");
  const adapter = createGeogebraAdapter({
    selfHostedScriptUrl: "/content/vendor/geogebra/local/deployggb.js",
    selfHostedHtml5Codebase: "/content/vendor/geogebra/local/web3d/",
    enableOnlineFallback: false,
  });

  const out = await adapter.buildViewer({
    openMode: "embed",
    assetPublicFileUrl: "/content/library/assets/a1/source/demo.ggb",
  });

  assert.equal(out.generated, true);
  assert.match(out.html, /content\/vendor\/geogebra\/local\/deployggb\.js/);
  assert.doesNotMatch(out.html, /https:\/\/www\.geogebra\.org\/apps\/deployggb\.js/);
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
