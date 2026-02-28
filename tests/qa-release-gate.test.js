const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("qa gate script includes required verification commands", () => {
  const script = fs.readFileSync("scripts/qa_release_gate.sh", "utf8");
  assert.match(script, /npm run guard:file-size/);
  assert.match(script, /npm run guard:security/);
  assert.match(script, /npm test/);
  assert.match(script, /npm --prefix frontend run test/);
  assert.match(script, /npm run typecheck:frontend/);
  assert.match(script, /npm run build:frontend/);
  assert.match(script, /npm run smoke:spa-public/);
  assert.match(script, /npm run smoke:spa-admin/);
  assert.match(script, /npm run smoke:spa-admin-write/);
  assert.match(script, /npm run smoke:spa-library-admin/);

  const buildIdx = script.indexOf("npm run build:frontend");
  const backendTestIdx = script.indexOf("npm test");
  assert.ok(buildIdx >= 0 && backendTestIdx >= 0 && buildIdx < backendTestIdx);
});
