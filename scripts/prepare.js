const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { ensureNodeVersion } = require("./lib/node_runtime_guard");

function findHuskyBin(rootDir) {
  const binName = process.platform === "win32" ? "husky.cmd" : "husky";
  return path.join(rootDir, "node_modules", ".bin", binName);
}

function main() {
  const rootDir = path.join(__dirname, "..");
  const versionError = ensureNodeVersion({ rootDir, currentVersion: process.version });
  if (versionError) {
    console.error(`[prepare] ${versionError.message}`);
    process.exit(1);
  }

  const huskyBin = findHuskyBin(rootDir);
  if (!fs.existsSync(huskyBin)) return;

  const result = spawnSync(huskyBin, ["install"], { stdio: "inherit" });
  if (typeof result.status === "number") process.exit(result.status);
}

if (require.main === module) {
  main();
}
