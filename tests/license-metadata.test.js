const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.join(__dirname, "..");

test("license metadata is consistent across package/readme/license", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf8"));
  const readme = fs.readFileSync(path.join(ROOT_DIR, "README.md"), "utf8");
  const license = fs.readFileSync(path.join(ROOT_DIR, "LICENSE"), "utf8");

  assert.equal(pkg.license, "AGPL-3.0-only");
  assert.match(readme, /\[AGPL-3\.0\]\(LICENSE\)/);
  assert.match(license, /GNU AFFERO GENERAL PUBLIC LICENSE/);
});
