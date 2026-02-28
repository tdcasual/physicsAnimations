const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("assets service orchestration module stays below 120 lines after read/write split", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../server/services/library/assetsService.js"), "utf8");
  const lines = source.split("\n").length;
  assert.equal(lines < 120, true);
});
