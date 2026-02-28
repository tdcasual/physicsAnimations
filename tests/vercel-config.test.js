const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("vercel includeFiles aligns with SPA dist runtime layout", () => {
  const config = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
  const includeFiles = config?.functions?.["api/index.js"]?.includeFiles;
  assert.ok(Array.isArray(includeFiles), "includeFiles must be an array");

  assert.ok(includeFiles.includes("frontend/dist/**"), "must include frontend/dist/** for SPA runtime");
  assert.equal(includeFiles.includes("index.html"), false, "legacy root index.html should not be included");
  assert.equal(includeFiles.includes("viewer.html"), false, "legacy root viewer.html should not be included");
});
