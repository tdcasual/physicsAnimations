const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("state orchestration module stays below 180 lines after parser split", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../server/lib/state.js"), "utf8");
  const lines = source.split("\n").length;
  assert.equal(lines < 180, true);
});
