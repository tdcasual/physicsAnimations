const test = require("node:test");
const assert = require("node:assert/strict");

test("registry rejects adapter without contract fields", async () => {
  const { createAdapterRegistry } = require("../server/services/library/adapters/registry");
  const registry = createAdapterRegistry([{ key: "x", match: () => true }]);
  assert.equal(registry.adapters.length, 0);
});

test("default adapters expose contract capabilities", async () => {
  const { createDefaultLibraryAdapterRegistry } = require("../server/services/library/adapters");
  const registry = createDefaultLibraryAdapterRegistry();
  const ggb = registry.getByKey("geogebra");
  const phet = registry.getByKey("phet");

  for (const adapter of [ggb, phet]) {
    assert.equal(typeof adapter?.capabilities?.supportsEmbed, "boolean");
    assert.equal(typeof adapter?.capabilities?.supportsDownload, "boolean");
    assert.equal(typeof adapter?.buildViewer, "function");
  }
});
