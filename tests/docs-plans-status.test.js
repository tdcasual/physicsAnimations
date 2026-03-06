const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const PLANS_DIR = path.join(__dirname, "..", "docs", "plans");

function readUtf8(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

test("plans docs do not claim the directory is empty when active plans exist", () => {
  const plansReadme = readUtf8("docs/plans/README.md");
  const docsIndex = readUtf8("docs/README.md");
  const activePlans = fs
    .readdirSync(PLANS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md");

  const emptyClaimPatterns = [/当前无进行中的计划文档/, /当前为空/, /仅保留目录说明/];

  if (activePlans.length === 0) {
    assert.match(plansReadme, /当前有效计划|当前状态/);
    assert.match(docsIndex, /docs\/plans/);
    return;
  }

  for (const pattern of emptyClaimPatterns) {
    assert.doesNotMatch(plansReadme, pattern);
    assert.doesNotMatch(docsIndex, pattern);
  }
});
