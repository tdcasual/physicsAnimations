const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("public smoke script falls back to default category when no public category exists", () => {
  const source = fs.readFileSync("scripts/smoke_spa_public.js", "utf8");
  assert.match(source, /categoryId:\s*"other"/);
  assert.doesNotMatch(source, /no public category found for smoke test/);
});
