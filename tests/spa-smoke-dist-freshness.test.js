const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const scripts = [
  "scripts/smoke_spa_public.js",
  "scripts/smoke_spa_admin.js",
  "scripts/smoke_spa_admin_writepath.js",
  "scripts/smoke_spa_library_admin.js",
];

test("spa smoke scripts enforce fresh frontend dist before running", () => {
  for (const file of scripts) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /ensureSpaDistFresh/);
    assert.match(source, /ensureSpaDistFresh\(\s*rootDir\s*\)/);
  }
});
