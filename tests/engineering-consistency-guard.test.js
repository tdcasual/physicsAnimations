const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.join(__dirname, "..");

function readUtf8(relPath) {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), "utf8");
}

test("npm runtime guard enables engine-strict installs", () => {
  const npmrcPath = path.join(ROOT_DIR, ".npmrc");
  assert.equal(fs.existsSync(npmrcPath), true, ".npmrc must exist");

  const source = readUtf8(".npmrc");
  assert.match(source, /^engine-strict\s*=\s*true\s*$/m);
});

test("package-lock root deps stay aligned with package.json declarations", () => {
  const pkg = JSON.parse(readUtf8("package.json"));
  const lock = JSON.parse(readUtf8("package-lock.json"));

  const rootLockDeps = lock?.packages?.[""]?.dependencies || {};
  const declaredDeps = pkg?.dependencies || {};

  for (const [name, range] of Object.entries(declaredDeps)) {
    assert.equal(
      rootLockDeps[name],
      range,
      `lockfile root dependency drift detected for ${name}`,
    );
  }
});
