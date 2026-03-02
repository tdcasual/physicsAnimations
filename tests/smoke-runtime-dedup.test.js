const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const smokeScripts = [
  "scripts/smoke_spa_public.js",
  "scripts/smoke_spa_admin.js",
  "scripts/smoke_spa_admin_writepath.js",
  "scripts/smoke_spa_library_admin.js",
];

test("smoke scripts reuse shared runtime helpers", () => {
  for (const scriptPath of smokeScripts) {
    const source = fs.readFileSync(scriptPath, "utf8");
    assert.match(source, /require\("\.\/lib\/smoke_runtime"\)/, `${scriptPath} should import shared smoke runtime helpers`);
    assert.doesNotMatch(source, /async function findOpenPort\s*\(/, `${scriptPath} should not define findOpenPort`);
    assert.doesNotMatch(source, /async function waitForHealth\s*\(/, `${scriptPath} should not define waitForHealth`);
    assert.doesNotMatch(source, /function startServer\s*\(/, `${scriptPath} should not define startServer`);
    assert.doesNotMatch(source, /function stopServer\s*\(/, `${scriptPath} should not define stopServer`);
  }
});

