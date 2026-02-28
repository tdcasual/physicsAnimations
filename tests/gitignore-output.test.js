const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test(".gitignore excludes generated output workspace", () => {
  const source = fs.readFileSync(".gitignore", "utf8");
  assert.match(source, /^output\/$/m);
});
