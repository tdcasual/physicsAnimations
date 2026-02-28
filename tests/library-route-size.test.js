const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("library route stays below 340 lines after route splitting", () => {
  const filePath = path.join(__dirname, "..", "server", "routes", "library.js");
  const source = fs.readFileSync(filePath, "utf8");
  const lines = source.split("\n").length;
  assert.ok(lines < 340, `server/routes/library.js has ${lines} lines, expected < 340`);
});
