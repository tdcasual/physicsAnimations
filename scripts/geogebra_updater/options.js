"use strict";

const path = require("node:path");
const {
  DEFAULT_BUNDLE_URL,
  DEFAULT_RETAIN,
} = require("./constants");

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

module.exports = {
  parseNonNegativeInteger,
  parseArgs,
  normalizeOptions,
  normalizeSha256,
  sanitizeVersionName,
  inferVersionName,
};
