const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("ops docs include rollback and recovery sections", () => {
  const release = fs.readFileSync("docs/guides/ops-release-runbook.md", "utf8");
  const incident = fs.readFileSync("docs/guides/ops-library-incident-runbook.md", "utf8");
  assert.match(release, /Rollback/i);
  assert.match(release, /Verification/i);
  assert.match(release, /qa:release/);
  assert.match(incident, /Permanent Delete/i);
  assert.match(incident, /Embed/i);
  assert.match(incident, /恢复/i);
});
