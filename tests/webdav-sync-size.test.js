const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("webdav sync orchestration module stays below 180 lines after helper split", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../server/lib/webdavSync.js"), "utf8");
  const lines = source.split("\n").length;
  assert.equal(lines < 180, true);
});
