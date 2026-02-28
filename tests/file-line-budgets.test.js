const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const configPath = path.join(projectRoot, "config", "file-line-budgets.json");

test("file line budget config covers core source domains", () => {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.ok(Array.isArray(config.rules));

  const hasServerJsRule = config.rules.some(
    (rule) => rule.root === "server" && Array.isArray(rule.extensions) && rule.extensions.includes(".js"),
  );
  const hasFrontendTsRule = config.rules.some(
    (rule) => rule.root === "frontend/src" && Array.isArray(rule.extensions) && rule.extensions.includes(".ts"),
  );
  const hasFrontendVueRule = config.rules.some(
    (rule) => rule.root === "frontend/src" && Array.isArray(rule.extensions) && rule.extensions.includes(".vue"),
  );

  assert.equal(hasServerJsRule, true);
  assert.equal(hasFrontendTsRule, true);
  assert.equal(hasFrontendVueRule, true);

  assert.ok(Number(config?.overrides?.["frontend/src/features/library/useLibraryAdminState.ts"]) < 500);
});

test("file line budget guard script passes for current workspace", () => {
  execFileSync(process.execPath, ["scripts/check_file_line_budgets.js"], {
    cwd: projectRoot,
    stdio: "pipe",
  });
});
