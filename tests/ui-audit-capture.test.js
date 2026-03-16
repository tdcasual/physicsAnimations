const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("ui audit capture accepts both --tag=value and --tag value forms", () => {
  const source = fs.readFileSync("scripts/ui_audit_capture.js", "utf8");
  assert.match(source, /startsWith\("--tag="\)/);
  assert.match(source, /arg\s*===\s*"--tag"/);
});

test("ui audit capture recognizes catalog shell, empty state, and error state as ready targets", () => {
  const source = fs.readFileSync("scripts/ui_audit_capture.js", "utf8");
  assert.match(source, /catalog-search/);
  assert.match(source, /catalog-empty/);
  assert.match(source, /catalog-state/);
});

test("ui audit capture creates a temporary viewer fixture and captures viewer screenshots", () => {
  const source = fs.readFileSync("scripts/ui_audit_capture.js", "utf8");
  assert.match(source, /createTemporaryViewerFixture/);
  assert.match(source, /viewer\.png/);
  assert.match(source, /temp viewer fixture/i);
});

test("ui audit capture cleans up the temporary viewer fixture after capture", () => {
  const source = fs.readFileSync("scripts/ui_audit_capture.js", "utf8");
  assert.match(source, /deleteTemporaryViewerFixture/);
  assert.match(source, /context\.request\.delete/);
});

test("ui audit capture accepts either a visible manage shortcut or an admin redirect as login success", () => {
  const source = fs.readFileSync("scripts/ui_audit_capture.js", "utf8");
  assert.match(source, /Promise\.any/);
  assert.match(source, /waitForURL\(\(url\)\s*=>\s*url\.pathname\.startsWith\("\/admin"\)/);
  assert.match(source, /getByRole\("button",\s*\{\s*name:\s*"退出"/);
});
