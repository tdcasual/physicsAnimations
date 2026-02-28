const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("sqlite mirror stays below 620 lines after extraction", () => {
  const filePath = path.join(__dirname, "..", "server", "lib", "stateDb", "sqliteMirror.js");
  const source = fs.readFileSync(filePath, "utf8");
  const lines = source.split("\n").length;
  assert.ok(lines < 620, `sqliteMirror.js has ${lines} lines, expected < 620`);
});
