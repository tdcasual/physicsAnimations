const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("items route stays below 220 lines after route composition split", () => {
  const filePath = path.join(__dirname, "..", "server", "routes", "items.js");
  const source = fs.readFileSync(filePath, "utf8");
  const lines = source.split("\n").length;

  assert.ok(
    lines < 220,
    `server/routes/items.js has ${lines} lines, expected < 220`,
  );
  assert.match(source, /registerItemsReadRoutes/);
  assert.match(source, /registerItemsCreateRoutes/);
  assert.match(source, /registerItemsWriteRoutes/);
  assert.match(source, /registerItemsTaskRoutes/);
});
