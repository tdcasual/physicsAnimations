const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("configuration and ops docs document READ_PATH_MODE rollout and rollback", () => {
  const configDoc = fs.readFileSync("docs/guides/configuration.md", "utf8");
  const runbook = fs.readFileSync("docs/guides/ops-release-runbook.md", "utf8");

  assert.match(configDoc, /\| `READ_PATH_MODE` \| `sql_only` \|/);
  assert.match(configDoc, /单轨 SQL 读路径/);
  assert.match(configDoc, /`READ_PATH_MODE=sql_only`/);
  assert.doesNotMatch(configDoc, /`READ_PATH_MODE=dual`/);

  assert.match(runbook, /READ_PATH_MODE/i);
  assert.match(runbook, /sql_only/i);
  assert.doesNotMatch(runbook, /READ_PATH_MODE=dual/i);
  assert.match(runbook, /rollback/i);
});
