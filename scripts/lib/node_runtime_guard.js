const fs = require("fs");
const path = require("path");

function parseMajorVersion(raw) {
  const text = String(raw || "").trim();
  if (!text) return Number.NaN;
  const match = text.match(/^v?(\d+)/i);
  if (!match) return Number.NaN;
  const major = Number.parseInt(match[1], 10);
  return Number.isFinite(major) ? major : Number.NaN;
}

function readExpectedMajor(rootDir) {
  const nodeVersionPath = path.join(rootDir, ".node-version");
  if (fs.existsSync(nodeVersionPath)) {
    const major = parseMajorVersion(fs.readFileSync(nodeVersionPath, "utf8"));
    if (Number.isFinite(major)) return major;
  }

  const packageJsonPath = path.join(rootDir, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const engine = String(pkg?.engines?.node || "");
      const match = engine.match(/>=\s*(\d+)/);
      if (match) {
        const major = Number.parseInt(match[1], 10);
        if (Number.isFinite(major)) return major;
      }
    } catch {
      // ignore malformed package.json and fall through
    }
  }

  return Number.NaN;
}

function validateNodeVersion(currentVersion, expectedMajor) {
  const current = parseMajorVersion(currentVersion);
  const expected = parseMajorVersion(expectedMajor);

  if (!Number.isFinite(expected)) {
    return {
      code: "node_version_guard_invalid_config",
      message: `Invalid expected Node major version: ${String(expectedMajor || "")}`,
    };
  }

  if (!Number.isFinite(current)) {
    return {
      code: "node_version_guard_invalid_runtime",
      message: `Unable to parse current Node version: ${String(currentVersion || "")}`,
    };
  }

  if (current !== expected) {
    return {
      code: "node_version_mismatch",
      message: `Unsupported Node.js version ${String(currentVersion)}. Required major version is ${expected}.x.`,
      expectedMajor: expected,
      currentMajor: current,
    };
  }

  return null;
}

function ensureNodeVersion({ rootDir, currentVersion } = {}) {
  const expectedMajor = readExpectedMajor(rootDir || process.cwd());
  return validateNodeVersion(currentVersion || process.version, expectedMajor);
}

module.exports = {
  parseMajorVersion,
  readExpectedMajor,
  validateNodeVersion,
  ensureNodeVersion,
};

