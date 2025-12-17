const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function findHuskyBin(rootDir) {
  const binName = process.platform === "win32" ? "husky.cmd" : "husky";
  return path.join(rootDir, "node_modules", ".bin", binName);
}

function main() {
  const rootDir = path.join(__dirname, "..");
  const huskyBin = findHuskyBin(rootDir);
  if (!fs.existsSync(huskyBin)) return;

  const result = spawnSync(huskyBin, ["install"], { stdio: "inherit" });
  if (typeof result.status === "number") process.exit(result.status);
}

main();

