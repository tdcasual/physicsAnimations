const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("serverless compatibility entrypoints are removed", () => {
  assert.equal(fs.existsSync("serverless-handler.js"), false);
  assert.equal(fs.existsSync("api/index.js"), false);
});
