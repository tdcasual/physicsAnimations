const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("items route stays below 500 lines after service extraction", () => {
  const filePath = path.join(__dirname, "..", "server", "routes", "items.js");
  const source = fs.readFileSync(filePath, "utf8");
  const lines = source.split("\n").length;

  assert.ok(
    lines < 500,
    `server/routes/items.js has ${lines} lines, expected < 500`,
  );
});

