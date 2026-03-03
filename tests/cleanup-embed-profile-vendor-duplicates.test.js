const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function makeFixtureRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-embed-vendor-clean-"));
  const base = path.join(
    rootDir,
    "content",
    "library",
    "vendor",
    "embed-profiles",
    "ep_test",
    "current",
  );

  fs.mkdirSync(path.join(base, "assets"), { recursive: true });
  fs.mkdirSync(path.join(base, "assets 2"), { recursive: true });
  fs.writeFileSync(path.join(base, "assets", "a.txt"), "canonical", "utf8");
  fs.writeFileSync(path.join(base, "assets 2", "a.txt"), "duplicate", "utf8");

  fs.writeFileSync(path.join(base, "embed.js"), "canonical-embed", "utf8");
  fs.writeFileSync(path.join(base, "embed 2.js"), "duplicate-embed", "utf8");

  fs.writeFileSync(path.join(base, "viewer.html"), "canonical-viewer", "utf8");
  fs.writeFileSync(path.join(base, "viewer 2.html"), "duplicate-viewer", "utf8");

  // should stay: no canonical pair
  fs.writeFileSync(path.join(base, "orphan 2.js"), "keep", "utf8");

  return rootDir;
}

function runScript(rootDir, args = []) {
  const scriptPath = path.join(process.cwd(), "scripts", "cleanup_embed_profile_vendor_duplicates.js");
  return spawnSync(process.execPath, [scriptPath, "--root", rootDir, ...args], {
    encoding: "utf8",
  });
}

test("cleanup_embed_profile_vendor_duplicates supports dry-run and apply safely", () => {
  const rootDir = makeFixtureRoot();
  const currentDir = path.join(
    rootDir,
    "content",
    "library",
    "vendor",
    "embed-profiles",
    "ep_test",
    "current",
  );

  try {
    const dryRun = runScript(rootDir, ["--dry-run"]);
    assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
    assert.match(dryRun.stdout, /embed 2\.js/);
    assert.match(dryRun.stdout, /viewer 2\.html/);
    assert.match(dryRun.stdout, /assets 2/);

    assert.equal(fs.existsSync(path.join(currentDir, "embed 2.js")), true);
    assert.equal(fs.existsSync(path.join(currentDir, "viewer 2.html")), true);
    assert.equal(fs.existsSync(path.join(currentDir, "assets 2")), true);

    const apply = runScript(rootDir, ["--apply"]);
    assert.equal(apply.status, 0, apply.stderr || apply.stdout);

    assert.equal(fs.existsSync(path.join(currentDir, "embed.js")), true);
    assert.equal(fs.existsSync(path.join(currentDir, "viewer.html")), true);
    assert.equal(fs.existsSync(path.join(currentDir, "assets")), true);

    assert.equal(fs.existsSync(path.join(currentDir, "embed 2.js")), false);
    assert.equal(fs.existsSync(path.join(currentDir, "viewer 2.html")), false);
    assert.equal(fs.existsSync(path.join(currentDir, "assets 2")), false);

    assert.equal(fs.existsSync(path.join(currentDir, "orphan 2.js")), true);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
