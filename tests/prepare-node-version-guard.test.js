const test = require("node:test");
const assert = require("node:assert/strict");

const { parseMajorVersion, validateNodeVersion } = require("../scripts/lib/node_runtime_guard");

test("prepare exports node version guard helpers", () => {
  assert.equal(typeof parseMajorVersion, "function");
  assert.equal(typeof validateNodeVersion, "function");
});

test("parseMajorVersion extracts numeric major from semver-like input", () => {
  assert.equal(parseMajorVersion("v24.3.0"), 24);
  assert.equal(parseMajorVersion("24"), 24);
  assert.equal(parseMajorVersion("  v24.0.1  "), 24);
});

test("validateNodeVersion accepts configured major and rejects mismatched major", () => {
  assert.equal(validateNodeVersion("v24.6.0", "24"), null);

  const mismatch = validateNodeVersion("v25.0.0", "24");
  assert.ok(mismatch);
  assert.equal(mismatch.code, "node_version_mismatch");
});
