const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.join(__dirname, "..");
const packageJsonPath = path.join(ROOT_DIR, "package.json");

test("backend dependencies are aligned to upgraded major versions", () => {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  assert.equal(pkg.dependencies?.express, "^5.2.1");
  assert.equal(pkg.dependencies?.["serverless-http"], "^4.0.0");
  assert.equal(pkg.dependencies?.bcryptjs, "^3.0.3");
  assert.equal(pkg.dependencies?.["iconv-lite"], "^0.7.2");
  assert.equal(pkg.dependencies?.["playwright-chromium"], "^1.58.2");
});
