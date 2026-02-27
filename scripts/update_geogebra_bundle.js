#!/usr/bin/env node

const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const unzipper = require("unzipper");

const DEFAULT_BUNDLE_URL = "https://download.geogebra.org/package/geogebra-math-apps-bundle";
const DEFAULT_RETAIN = 0;
const DEFAULT_LOCK_FILE_NAME = "update.lock";

function printHelp() {
  console.log(`Usage: node scripts/update_geogebra_bundle.js [options]

Options:
  --url <bundle-url>        GeoGebra bundle URL (default: ${DEFAULT_BUNDLE_URL})
  --version <name>          Release folder name (default: inferred from final URL)
  --root <project-root>     Project root path (default: current working directory)
  --retain <count>          Keep newest release directories (0 = keep all, default: ${DEFAULT_RETAIN})
  --sha256 <hex>            Validate downloaded zip sha256 (64 hex chars)
  --lock-file <path>        Lock file path (default: content/library/vendor/geogebra/${DEFAULT_LOCK_FILE_NAME})
  --no-lock                 Disable lock file check
  --force                   Overwrite existing release with same version
  --keep-temp               Keep temporary download/extract directory for debugging
  --help                    Show this help
`);
}

function parseNonNegativeInteger(value, optionName) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`Missing ${optionName} value`);
  if (!/^\d+$/.test(text)) throw new Error(`${optionName} must be a non-negative integer`);
  return Number(text);
}

function normalizeSha256(value) {
  const out = String(value || "").trim().toLowerCase();
  if (!out) return "";
  if (!/^[a-f0-9]{64}$/.test(out)) {
    throw new Error("--sha256 must be a 64-character hexadecimal string");
  }
  return out;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const raw = String(value).trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") return true;
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return false;
  return fallback;
}

function normalizeOptions(raw = {}) {
  const retain = raw.retain === undefined || raw.retain === null || raw.retain === ""
    ? DEFAULT_RETAIN
    : parseNonNegativeInteger(raw.retain, "--retain");

  const rootDir = path.resolve(String(raw.rootDir || process.cwd()).trim() || process.cwd());
  const url = String(raw.url || "").trim();
  if (!url) throw new Error("Missing --url value");

  const lockFileRaw = String(raw.lockFile || "").trim();

  return {
    url,
    version: String(raw.version || "").trim(),
    rootDir,
    retain,
    sha256: normalizeSha256(raw.sha256),
    force: normalizeBoolean(raw.force, false),
    keepTemp: normalizeBoolean(raw.keepTemp, false),
    help: normalizeBoolean(raw.help, false),
    noLock: normalizeBoolean(raw.noLock, false),
    lockFile: lockFileRaw ? path.resolve(lockFileRaw) : "",
  };
}

function parseArgs(argv) {
  const out = {
    url: DEFAULT_BUNDLE_URL,
    version: "",
    rootDir: process.cwd(),
    retain: DEFAULT_RETAIN,
    sha256: "",
    lockFile: "",
    noLock: false,
    force: false,
    keepTemp: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      out.help = true;
      continue;
    }
    if (token === "--force") {
      out.force = true;
      continue;
    }
    if (token === "--keep-temp") {
      out.keepTemp = true;
      continue;
    }
    if (token === "--url") {
      out.url = String(argv[i + 1] || "").trim();
      i += 1;
      continue;
    }
    if (token === "--version") {
      out.version = String(argv[i + 1] || "").trim();
      i += 1;
      continue;
    }
    if (token === "--root") {
      out.rootDir = path.resolve(String(argv[i + 1] || "").trim() || process.cwd());
      i += 1;
      continue;
    }
    if (token === "--retain") {
      out.retain = parseNonNegativeInteger(argv[i + 1], "--retain");
      i += 1;
      continue;
    }
    if (token === "--sha256") {
      out.sha256 = normalizeSha256(argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === "--lock-file") {
      const lockFile = String(argv[i + 1] || "").trim();
      if (!lockFile) throw new Error("Missing --lock-file value");
      out.lockFile = path.resolve(lockFile);
      i += 1;
      continue;
    }
    if (token === "--no-lock") {
      out.noLock = true;
      continue;
    }
    throw new Error(`Unknown option: ${token}`);
  }

  return normalizeOptions(out);
}

function sanitizeVersionName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function inferVersionName(finalUrl) {
  try {
    const u = new URL(finalUrl);
    const base = path.basename(u.pathname || "").replace(/\.zip$/i, "");
    const cleaned = sanitizeVersionName(base);
    if (cleaned) return cleaned;
  } catch {
    // ignore
  }
  return `geogebra-${Date.now()}`;
}

async function extractZipToDir(zipPath, outDir) {
  await fsp.mkdir(outDir, { recursive: true });
  await fs
    .createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: outDir }))
    .promise();
}

async function findFirstFileByName(rootDir, fileName) {
  const queue = [rootDir];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(full);
      if (entry.isFile() && entry.name === fileName) return full;
    }
  }
  return "";
}

async function findFirstWeb3dDir(rootDir) {
  const queue = [rootDir];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.toLowerCase() === "web3d") {
          const marker = path.join(full, "web3d.nocache.js");
          try {
            const markerStat = await fsp.stat(marker);
            if (markerStat.isFile()) return full;
          } catch {
            // keep searching
          }
        }
        queue.push(full);
      }
    }
  }
  return "";
}

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

async function acquireLock(lockFilePath) {
  await fsp.mkdir(path.dirname(lockFilePath), { recursive: true });
  let handle;
  try {
    handle = await fsp.open(lockFilePath, "wx", 0o644);
  } catch (err) {
    if (err && err.code === "EEXIST") {
      throw new Error(`Update lock already exists: ${lockFilePath}`);
    }
    throw err;
  }
  await handle.writeFile(`${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`, "utf8");
  let released = false;
  return async function release() {
    if (released) return;
    released = true;
    await handle.close().catch(() => {});
    await fsp.rm(lockFilePath, { force: true }).catch(() => {});
  };
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
    const response = await fetch(args.url, { redirect: "follow" });
    if (!response.ok || !response.body) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(zipPath));
    const finalUrl = response.url || args.url;

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

async function run() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }
  await runUpdate(args);
}

if (require.main === module) {
  run().catch((err) => {
    console.error(`[geogebra] Update failed: ${err?.message || err}`);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_BUNDLE_URL,
  parseArgs,
  runUpdate,
  normalizeSha256,
  computeFileSha256,
  acquireLock,
  pruneOldReleases,
};
