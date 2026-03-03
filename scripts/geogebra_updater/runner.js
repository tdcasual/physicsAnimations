"use strict";

const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  DEFAULT_BUNDLE_URL,
  DEFAULT_LOCK_FILE_NAME,
} = require("./constants");
const {
  normalizeOptions,
  sanitizeVersionName,
  inferVersionName,
} = require("./options");
const {
  ensureCleanReleaseDir,
  replaceSymlink,
  ensureCurrentIsReplaceable,
  computeFileSha256,
  pruneOldReleases,
} = require("./fs");
const { acquireLock } = require("./lock");
const {
  downloadBundle,
  extractZipToDir,
  findFirstFileByName,
  findFirstWeb3dDir,
} = require("./bundle");

async function runUpdate(rawOptions = {}) {
  const args = normalizeOptions({
    url: DEFAULT_BUNDLE_URL,
    rootDir: process.cwd(),
    ...rawOptions,
  });

  const rootDir = path.resolve(args.rootDir);
  const vendorDir = path.join(rootDir, "content", "library", "vendor", "geogebra");
  const releasesDir = path.join(vendorDir, "releases");
  const currentDir = path.join(vendorDir, "current");
  const lockFilePath = args.lockFile || path.join(vendorDir, DEFAULT_LOCK_FILE_NAME);

  await fsp.mkdir(releasesDir, { recursive: true });
  await ensureCurrentIsReplaceable(currentDir);

  let releaseLock = async () => {};
  if (!args.noLock) {
    releaseLock = await acquireLock(lockFilePath);
    console.log(`[geogebra] Lock acquired: ${lockFilePath}`);
  }

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "pa-geogebra-bundle-"));
  const zipPath = path.join(tempDir, "bundle.zip");
  const extractDir = path.join(tempDir, "extract");

  try {
    console.log(`[geogebra] Downloading bundle: ${args.url}`);
    const finalUrl = await downloadBundle(args.url, zipPath);

    if (args.sha256) {
      const actualSha256 = await computeFileSha256(zipPath);
      if (actualSha256 !== args.sha256) {
        throw new Error(`sha256 mismatch: expected=${args.sha256} actual=${actualSha256}`);
      }
      console.log(`[geogebra] sha256 verified: ${actualSha256}`);
    }

    const version = sanitizeVersionName(args.version) || inferVersionName(finalUrl);
    const releaseDir = path.join(releasesDir, version);
    await ensureCleanReleaseDir(releaseDir, args.force);
    await fsp.mkdir(releaseDir, { recursive: true });

    console.log(`[geogebra] Extracting archive -> ${releaseDir}`);
    await extractZipToDir(zipPath, extractDir);

    const bundleDir = path.join(releaseDir, "bundle");
    await fsp.cp(extractDir, bundleDir, { recursive: true });

    const deployFile = await findFirstFileByName(bundleDir, "deployggb.js");
    if (!deployFile) {
      throw new Error("deployggb.js not found in extracted bundle");
    }
    const web3dDir = await findFirstWeb3dDir(bundleDir);
    if (!web3dDir) {
      throw new Error("web3d directory (with web3d.nocache.js) not found in extracted bundle");
    }

    await replaceSymlink(path.join(releaseDir, "deployggb.js"), deployFile, "file");
    await replaceSymlink(path.join(releaseDir, "web3d"), web3dDir, "dir");

    const manifest = {
      updatedAt: new Date().toISOString(),
      sourceUrl: args.url,
      resolvedUrl: finalUrl,
      version,
      bundleDir: path.relative(releaseDir, bundleDir),
      deployFile: path.relative(releaseDir, deployFile),
      web3dDir: path.relative(releaseDir, web3dDir),
      publicScriptUrl: "/content/library/vendor/geogebra/current/deployggb.js",
      publicCodebaseUrl: "/content/library/vendor/geogebra/current/web3d/",
    };
    await fsp.writeFile(path.join(releaseDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    await replaceSymlink(currentDir, releaseDir, "dir");

    const removedReleases = await pruneOldReleases({
      releasesDir,
      retain: args.retain,
      protectedPaths: [releaseDir],
    });

    console.log("[geogebra] Bundle updated successfully.");
    console.log(`[geogebra] Current release: ${version}`);
    console.log(`[geogebra] Script URL: ${manifest.publicScriptUrl}`);
    console.log(`[geogebra] HTML5Codebase URL: ${manifest.publicCodebaseUrl}`);
    if (removedReleases.length > 0) {
      console.log(`[geogebra] Pruned releases: ${removedReleases.join(", ")}`);
    }

    return {
      version,
      releaseDir,
      currentDir,
      manifest,
      removedReleases,
      lockFilePath: args.noLock ? "" : lockFilePath,
    };
  } finally {
    if (!args.keepTemp) {
      await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    } else {
      console.log(`[geogebra] Temp files kept at: ${tempDir}`);
    }
    await releaseLock();
  }
}

module.exports = {
  runUpdate,
};
