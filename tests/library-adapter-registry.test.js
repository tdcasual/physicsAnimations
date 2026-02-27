const test = require("node:test");
const assert = require("node:assert/strict");

test("createAdapterRegistry exposes lookup helpers", async () => {
  const { createAdapterRegistry } = require("../server/services/library/adapters/registry");
  assert.equal(typeof createAdapterRegistry, "function");

  const registry = createAdapterRegistry([]);
  assert.equal(typeof registry.findForFile, "function");
  assert.equal(typeof registry.getByKey, "function");
  assert.equal(Array.isArray(registry.adapters), true);
});

test("createAdapterRegistry registers adapters and resolves by matcher", async () => {
  const { createAdapterRegistry } = require("../server/services/library/adapters/registry");

  const registry = createAdapterRegistry([
    { key: "zip", match: ({ fileName }) => String(fileName || "").endsWith(".zip") },
    { key: "ggb", match: ({ fileName }) => String(fileName || "").endsWith(".ggb") },
  ]);

  const found = registry.findForFile({ fileName: "demo.ggb" });
  assert.equal(found?.key, "ggb");

  const zip = registry.getByKey("zip");
  assert.equal(zip?.key, "zip");

  assert.equal(registry.findForFile({ fileName: "demo.txt" }), null);
  assert.equal(registry.getByKey("missing"), null);
});

test("createAdapterRegistry skips invalid adapter entries", async () => {
  const { createAdapterRegistry } = require("../server/services/library/adapters/registry");

  const registry = createAdapterRegistry([
    null,
    {},
    { key: "", match: () => true },
    { key: "ok", match: () => true },
  ]);

  assert.equal(registry.adapters.length, 1);
  assert.equal(registry.adapters[0].key, "ok");
});
