const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("ui audit capture accepts both --tag=value and --tag value forms", () => {
  const source = fs.readFileSync("scripts/ui_audit_capture.js", "utf8");
  assert.match(source, /startsWith\("--tag="\)/);
  assert.match(source, /arg\s*===\s*"--tag"/);
});

test("ui audit capture recognizes catalog shell, empty state, and error state as ready targets", () => {
  const source = fs.readFileSync("scripts/ui_audit_capture.js", "utf8");
  assert.match(source, /catalog-search/);
  assert.match(source, /catalog-empty/);
  assert.match(source, /catalog-state/);
});
