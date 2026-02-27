const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("library smoke script covers upload/delete/restore/permanent-delete lifecycle", () => {
  const source = fs.readFileSync("scripts/smoke_spa_library_admin.js", "utf8");
  assert.match(source, /\/admin\/library/);
  assert.match(source, /\/api\/library\/folders/);
  assert.match(source, /\/api\/library\/assets\//);
  assert.match(source, /\/restore/);
  assert.match(source, /\/permanent/);
  assert.match(source, /smoke_library_admin_pass/);
});
