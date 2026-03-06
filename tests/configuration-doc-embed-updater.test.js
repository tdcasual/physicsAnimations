const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("deployment and configuration guides document the generic embed updater flow", () => {
  const readme = readUtf8("README.md");
  const deployment = readUtf8("docs/guides/deployment.md");
  const configuration = readUtf8("docs/guides/configuration.md");

  assert.match(readme, /GeoGebra.*Embed 平台|Embed 平台.*GeoGebra/);
  assert.match(deployment, /ggb-updater/);
  assert.match(deployment, /建议每天|daily|每日/);
  assert.match(deployment, /20 天/);
  assert.match(configuration, /系统设置/);
  assert.match(configuration, /20 天/);
});
