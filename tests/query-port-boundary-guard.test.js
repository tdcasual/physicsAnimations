const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const GUARDED_FILES = [
  "server/lib/catalog/dynamicLoader.js",
  "server/lib/categoriesPayload.js",
];

test("business-layer catalog/category loaders do not access store.stateDbQuery directly", () => {
  for (const filePath of GUARDED_FILES) {
    const source = fs.readFileSync(filePath, "utf8");
    assert.doesNotMatch(source, /store\.stateDbQuery/, `${filePath} must use query ports only`);
  }
});
