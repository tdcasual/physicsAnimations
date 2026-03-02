const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("vercel serverless config is removed", () => {
  assert.equal(fs.existsSync("vercel.json"), false);
});
