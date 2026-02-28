const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("serverless handler reuses api/index app entry to avoid dual wiring drift", () => {
  const source = fs.readFileSync("serverless-handler.js", "utf8");
  assert.match(source, /require\(\"\.\/api\/index\"\)/);
});
