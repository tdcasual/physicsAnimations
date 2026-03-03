const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("configuration and ops docs document built-in sql-only read contract without mode toggle", () => {
  const configDoc = fs.readFileSync("docs/guides/configuration.md", "utf8");
  const runbook = fs.readFileSync("docs/guides/ops-release-runbook.md", "utf8");

  assert.match(configDoc, /单轨 SQL 读路径/);
  assert.match(configDoc, /内建\s*`?sql_only`?|固定\s*`?sql_only`?/i);
  assert.doesNotMatch(configDoc, /`READ_PATH_MODE`/);
  assert.doesNotMatch(configDoc, /`READ_PATH_MODE=dual`/i);

  assert.doesNotMatch(runbook, /READ_PATH_MODE/i);
  assert.match(runbook, /sql_only/i);
  assert.match(runbook, /rollback/i);
});
