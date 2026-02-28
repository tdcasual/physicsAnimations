const fs = require("node:fs");
const path = require("node:path");

function latestMtimeMs(targetPath) {
  if (!fs.existsSync(targetPath)) return 0;
  const stat = fs.statSync(targetPath);
  if (!stat.isDirectory()) return stat.mtimeMs;

  let newest = stat.mtimeMs;
  for (const entry of fs.readdirSync(targetPath)) {
    const childPath = path.join(targetPath, entry);
    const childMtime = latestMtimeMs(childPath);
    if (childMtime > newest) newest = childMtime;
  }
  return newest;
}

function ensureSpaDistFresh(rootDir) {
  const frontendDir = path.join(rootDir, "frontend");
  const distDir = path.join(frontendDir, "dist");
  const distIndexPath = path.join(distDir, "index.html");

  if (!fs.existsSync(distIndexPath)) {
    throw new Error("frontend/dist is missing. Run `npm run build:frontend` before smoke tests.");
  }

  const sourceCandidates = [
    path.join(frontendDir, "src"),
    path.join(frontendDir, "public"),
    path.join(frontendDir, "index.html"),
    path.join(frontendDir, "vite.config.ts"),
    path.join(frontendDir, "vite.config.js"),
    path.join(frontendDir, "package.json"),
  ];

  const sourceNewest = sourceCandidates.reduce((max, candidate) => {
    const mtimeMs = latestMtimeMs(candidate);
    return mtimeMs > max ? mtimeMs : max;
  }, 0);
  const distNewest = latestMtimeMs(distDir);

  if (sourceNewest > distNewest) {
    throw new Error("frontend/dist is stale. Run `npm run build:frontend` before smoke tests.");
  }
}

module.exports = {
  ensureSpaDistFresh,
};
