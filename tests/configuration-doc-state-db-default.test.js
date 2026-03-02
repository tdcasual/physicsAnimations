const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("configuration/deployment guides align with sqlite default state db runtime", () => {
  const configDoc = fs.readFileSync("docs/guides/configuration.md", "utf8");
  const deployDoc = fs.readFileSync("docs/guides/deployment.md", "utf8");

  assert.match(configDoc, /\| `STATE_DB_MODE` \| `sqlite` \|/);
  assert.match(configDoc, /显式设置 `STATE_DB_MODE=off`/);

  assert.match(deployDoc, /默认会启用 `sqlite` 状态数据库/);
  assert.match(deployDoc, /显式设置 `STATE_DB_MODE=off`/);
});
