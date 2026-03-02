const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function makeTempRoot({
  prefix = "pa-test-",
  animationsJson = "{}\n",
  withAssets = true,
  withAnimations = true,
  withContent = true,
} = {}) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));

  if (withAssets) fs.mkdirSync(path.join(rootDir, "assets"), { recursive: true });
  if (withAnimations) fs.mkdirSync(path.join(rootDir, "animations"), { recursive: true });
  if (withContent) fs.mkdirSync(path.join(rootDir, "content"), { recursive: true });
  if (animationsJson !== undefined) {
    fs.writeFileSync(path.join(rootDir, "animations.json"), String(animationsJson), "utf8");
  }

  return rootDir;
}

function removeTempRoot(rootDir) {
  if (!rootDir) return;
  fs.rmSync(rootDir, { recursive: true, force: true });
}

module.exports = {
  makeTempRoot,
  removeTempRoot,
};

