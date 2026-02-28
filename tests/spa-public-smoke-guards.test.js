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
