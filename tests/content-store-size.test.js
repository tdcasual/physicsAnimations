const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("content store module stays below 240 lines after provider split", () => {
  const filePath = path.join(__dirname, "..", "server", "lib", "contentStore.js");
  const source = fs.readFileSync(filePath, "utf8");
  const lines = source.split("\n").length;

  assert.ok(lines < 240, `server/lib/contentStore.js has ${lines} lines, expected < 240`);
  assert.match(source, /createLocalStore/);
  assert.match(source, /createWebdavStore/);
  assert.match(source, /createHybridStore/);
});
