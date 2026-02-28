const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("catalog orchestration module stays below 190 lines after loader split", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../server/lib/catalog.js"), "utf8");
  const lines = source.split("\n").length;
  assert.equal(lines < 190, true);
});
