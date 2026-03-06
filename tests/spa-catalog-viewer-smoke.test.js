const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("catalog-viewer smoke script delegates to the public smoke flow", () => {
  const source = fs.readFileSync("scripts/smoke_spa_catalog_viewer.js", "utf8");
  assert.match(source, /require\("\.\/smoke_spa_public"\)/);
  assert.match(source, /const\s*\{\s*run\s*\}/);
  assert.match(source, /smoke_catalog_viewer_failed/);
});
