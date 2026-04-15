const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function readUiAuditSources() {
  return [
    fs.readFileSync("scripts/ui_audit_capture.js", "utf8"),
    fs.readFileSync("scripts/lib/catalog_ready_state.js", "utf8"),
    fs.readFileSync("scripts/lib/ui_audit_capture_runtime.js", "utf8"),
    fs.readFileSync("scripts/lib/smoke_admin_auth.js", "utf8"),
  ].join("\n");
}

test("ui audit capture accepts both --tag=value and --tag value forms", () => {
  const source = fs.readFileSync("scripts/ui_audit_capture.js", "utf8");
  assert.match(source, /startsWith\("--tag="\)/);
  assert.match(source, /arg\s*===\s*"--tag"/);
});

test("ui audit capture delegates the bulky viewport runtime helpers into scripts/lib", () => {
  const source = fs.readFileSync("scripts/ui_audit_capture.js", "utf8");
  assert.match(source, /ui_audit_capture_runtime/);
});

test("ui audit capture recognizes catalog shell, empty state, and error state as ready targets", () => {
  const source = readUiAuditSources();
  assert.match(source, /input\[type="search"\]/);
  assert.match(source, /cat-group-tabs/);
  assert.match(source, /cat-card/);
  assert.match(source, /加载目录失败/);
});

test("ui audit capture creates a temporary viewer fixture and captures viewer screenshots", () => {
  const source = readUiAuditSources();
  assert.match(source, /createTemporaryViewerFixture/);
  assert.match(source, /viewer\.png/);
  assert.match(source, /temp viewer fixture/i);
});

test("ui audit capture cleans up the temporary viewer fixture after capture", () => {
  const source = readUiAuditSources();
  assert.match(source, /deleteTemporaryViewerFixture/);
  assert.match(source, /context\.request\.delete/);
});

test("ui audit capture accepts either a visible manage shortcut or an admin redirect as login success", () => {
  const source = readUiAuditSources();
  assert.match(source, /Promise\.any/);
  assert.match(source, /waitForURL\(\(url\)\s*=>\s*url\.pathname\.startsWith\("\/admin"\)/);
  assert.match(source, /getByRole\("button",\s*\{\s*name:\s*"退出"/);
});

test("ui audit capture and smoke auth helpers can reveal auth actions from the mobile more panel", () => {
  const source = readUiAuditSources();
  assert.match(source, /revealTopbarAuthActions/);
  assert.match(source, /topbar-more-trigger/);
  assert.match(source, /topbar-more-panel/);
});
