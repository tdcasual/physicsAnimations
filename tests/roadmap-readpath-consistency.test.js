const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("roadmap keeps current read-path contract as sql_only without active json fallback wording", () => {
  const source = fs.readFileSync("docs/guides/continuous-improvement-roadmap.md", "utf8");
  assert.match(source, /READ_PATH_MODE=sql_only/);
  assert.doesNotMatch(source, /SQL query path 缺失或抛错时优先降级到 JSON 读路径/);
});

test("configuration documents strict invalid STATE_DB_MODE behavior", () => {
  const source = fs.readFileSync("docs/guides/configuration.md", "utf8");
  assert.match(source, /STATE_DB_MODE/);
  assert.match(source, /非法.*STATE_DB_MODE|invalid_state_db_mode|启动.*失败/);
});
