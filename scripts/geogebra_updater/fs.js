"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureCleanReleaseDir(releaseDir, force) {
  if (!(await pathExists(releaseDir))) return;
  if (!force) {
    throw new Error(`Release already exists: ${releaseDir}. Re-run with --force or choose another --version.`);
  }
  await fsp.rm(releaseDir, { recursive: true, force: true });
}

async function replaceSymlink(linkPath, targetPath, type = "file") {
  await fsp.rm(linkPath, { recursive: true, force: true });
  const relativeTarget = path.relative(path.dirname(linkPath), targetPath) || ".";
  await fsp.symlink(relativeTarget, linkPath, type);
}

async function ensureCurrentIsReplaceable(currentPath) {
  try {
    const stat = await fsp.lstat(currentPath);
    if (!stat.isSymbolicLink()) {
      throw new Error(`Refusing to overwrite non-symlink path: ${currentPath}`);
    }
  } catch (err) {
    if (err && err.code === "ENOENT") return;
    throw err;
  }
}

async function computeFileSha256(filePath) {
  const hash = crypto.createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

async function listReleaseDirs(releasesDir) {
  const entries = await fsp.readdir(releasesDir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(releasesDir, entry.name);
    const stat = await fsp.lstat(fullPath);
    if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
    out.push({
      name: entry.name,
      fullPath,
      mtimeMs: stat.mtimeMs,
    });
  }
  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out;
}

async function pruneOldReleases({ releasesDir, retain, protectedPaths = [] }) {
  if (!retain || retain <= 0) return [];
  const releases = await listReleaseDirs(releasesDir);
  const keep = new Set();
  for (let i = 0; i < Math.min(retain, releases.length); i += 1) {
    keep.add(path.resolve(releases[i].fullPath));
  }
  for (const item of protectedPaths) {
    if (item) keep.add(path.resolve(item));
  }

  const removed = [];
  for (const item of releases) {
    const absolute = path.resolve(item.fullPath);
    if (keep.has(absolute)) continue;
    await fsp.rm(absolute, { recursive: true, force: true });
    removed.push(item.name);
  }
  return removed;
}

module.exports = {
  pathExists,
  ensureCleanReleaseDir,
  replaceSymlink,
  ensureCurrentIsReplaceable,
  computeFileSha256,
  pruneOldReleases,
};
