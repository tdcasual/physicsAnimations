const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const logger = require("../server/lib/logger");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.status !== 0) process.exit(result.status || 1);
}

function main() {
  const rootDir = path.join(__dirname, "..");
  const baseDir = path.join(rootDir, ".cache", "playwright-deps");
  const debDir = path.join(baseDir, "debs");
  const rootfsDir = path.join(baseDir, "rootfs");

  ensureDir(debDir);
  ensureDir(rootfsDir);

  run("apt-get", ["download", "libnspr4", "libnss3"], { cwd: debDir });

  const debs = fs
    .readdirSync(debDir)
    .filter((name) => name.endsWith(".deb"))
    .map((name) => path.join(debDir, name));

  for (const debPath of debs) {
    run("dpkg-deb", ["-x", debPath, rootfsDir]);
  }

  logger.info("playwright_deps_extracted", { rootfsDir });
  logger.info("playwright_deps_libs_path", {
    libsPath: path.join(rootfsDir, "usr", "lib", "x86_64-linux-gnu"),
  });
}

main();
