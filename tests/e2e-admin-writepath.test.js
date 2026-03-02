const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("admin write-path e2e command is wired into npm scripts", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const command = packageJson?.scripts?.["test:e2e:admin-write"] || "";
  assert.match(String(command), /^node scripts\/smoke_spa_admin_writepath\.js$/);
});

test("admin write-path smoke script tracks console/page errors and api 5xx responses", () => {
  const source = fs.readFileSync("scripts/smoke_spa_admin_writepath.js", "utf8");
  assert.match(source, /consoleErrors/);
  assert.match(source, /pageErrors/);
  assert.match(source, /response\.status\(\)\s*>=\s*500/);
});
