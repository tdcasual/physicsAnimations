const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("legacy static catalog/thumbnails toolchain is removed from runtime scripts", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const scripts = pkg.scripts || {};

  assert.equal("update-list" in scripts, false, "update-list should be removed");
  assert.equal("generate-thumbnails" in scripts, false, "generate-thumbnails should be removed");
  assert.equal("build-catalog" in scripts, false, "build-catalog should be removed");

  assert.equal(fs.existsSync("generate_list.js"), false, "generate_list.js should be removed");
  assert.equal(fs.existsSync("scripts/generate_thumbnails.js"), false, "generate_thumbnails.js should be removed");
});
