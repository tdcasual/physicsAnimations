const fs = require("fs");
const path = require("path");

function existingDirs(dirs) {
  return dirs.filter((dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory());
}

function buildPlaywrightEnv({ rootDir }) {
  const depsRoot = path.join(rootDir, ".cache", "playwright-deps", "rootfs");
  const candidateDirs = [
    path.join(depsRoot, "usr", "lib", "x86_64-linux-gnu"),
    path.join(depsRoot, "lib", "x86_64-linux-gnu"),
  ];

  const extraDirs = existingDirs(candidateDirs);
  if (!extraDirs.length) return { ...process.env };

  const extra = extraDirs.join(":");
  const current = process.env.LD_LIBRARY_PATH || "";
  const ldLibraryPath = current ? `${extra}:${current}` : extra;

  return { ...process.env, LD_LIBRARY_PATH: ldLibraryPath };
}

module.exports = {
  buildPlaywrightEnv,
};

