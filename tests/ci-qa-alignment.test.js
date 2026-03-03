const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("GitHub workflow runs qa:release as the single verification gate", () => {
  const workflow = fs.readFileSync(".github/workflows/docker-image.yml", "utf8");
  assert.match(workflow, /run:\s*npm run qa:release/);
  assert.doesNotMatch(workflow, /smoke_script:/);
});
