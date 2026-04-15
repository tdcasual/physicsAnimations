const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("public smoke script does not blanket-ignore animation or frame-policy errors", () => {
  const source = fs.readFileSync("scripts/smoke_spa_public.js", "utf8");
  assert.doesNotMatch(source, /url\.includes\(\"\/animations\/\"\)/);
  assert.doesNotMatch(source, /X-Frame-Options/);
  assert.doesNotMatch(source, /Content Security Policy/);
  assert.doesNotMatch(source, /Refused to frame/);
  assert.doesNotMatch(source, /stack\.includes\(\"\/animations\/\"\)/);
});

test("public smoke script targets the current catalog shell selectors", () => {
  const source = [
    fs.readFileSync("scripts/smoke_spa_public.js", "utf8"),
    fs.readFileSync("scripts/lib/catalog_ready_state.js", "utf8"),
  ].join("\n");

  assert.match(source, /cat-group-tabs/);
  assert.match(source, /cat-category-tabs/);
  assert.match(source, /input\[type="search"\]/);
  assert.match(source, /cat-card/);
  assert.match(source, /原页面\|打开原页面/);
  assert.doesNotMatch(source, /navigation",\s*\{\s*name:\s*"大类"/);
  assert.doesNotMatch(source, /\.catalog-card/);
  assert.doesNotMatch(source, /\.viewer-back/);
});
