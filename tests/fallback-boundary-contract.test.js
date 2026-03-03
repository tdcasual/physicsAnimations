const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("library fallback boundary is preserved and explicitly documented as the only retained compatibility surface", () => {
  const geogebraAdapter = readUtf8("server/services/library/adapters/geogebra.js");
  const libraryRoutes = readUtf8("server/routes/library.js");
  const configDoc = readUtf8("docs/guides/configuration.md");
  const deploymentDoc = readUtf8("docs/guides/deployment.md");

  // Runtime contracts: keep dual-source fallback behavior for library embed only.
  assert.match(geogebraAdapter, /enableOnlineFallback/);
  assert.match(geogebraAdapter, /DEFAULT_ONLINE_FALLBACK_SCRIPT_URL/);
  assert.match(libraryRoutes, /fallbackScriptUrl/);

  // Documentation contracts: must call out this boundary explicitly.
  assert.match(configDoc, /仅保留.*双源.*fallback/i);
  assert.match(deploymentDoc, /仅保留.*双源.*fallback/i);
});
