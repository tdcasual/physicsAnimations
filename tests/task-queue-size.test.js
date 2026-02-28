const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("task queue orchestration module stays below 280 lines after persistence split", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../server/lib/taskQueue.js"), "utf8");
  const lines = source.split("\n").length;
  assert.equal(lines < 280, true);
});
