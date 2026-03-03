#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    apply: false,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--root") {
      const next = argv[i + 1];
      if (!next) throw new Error("missing_root_path");
      args.root = path.resolve(next);
      i += 1;
      continue;
    }
    if (token === "--apply") {
      args.apply = true;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
  }

  if (!args.apply) args.dryRun = true;
  return args;
}

function deriveCanonicalName(name) {
  return String(name || "").replace(/ 2(\.[^/]+)?$/, "$1");
}

function listCurrentDirs(embedProfilesRoot) {
  if (!fs.existsSync(embedProfilesRoot)) return [];
  const entries = fs.readdirSync(embedProfilesRoot, { withFileTypes: true });
  const out = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const currentDir = path.join(embedProfilesRoot, entry.name, "current");
    if (fs.existsSync(currentDir) && fs.statSync(currentDir).isDirectory()) {
      out.push(currentDir);
    }
  }

  return out;
}

function collectDuplicateCandidates(currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const candidates = [];

  for (const entry of entries) {
    const duplicateName = entry.name;
    const canonicalName = deriveCanonicalName(duplicateName);
    if (!canonicalName || canonicalName === duplicateName) continue;

    const duplicatePath = path.join(currentDir, duplicateName);
    const canonicalPath = path.join(currentDir, canonicalName);
    if (!fs.existsSync(canonicalPath)) continue;

    candidates.push({ duplicatePath, duplicateName, canonicalPath, currentDir });
  }

  return candidates;
}

function removePath(targetPath) {
  const stat = fs.lstatSync(targetPath);
  if (stat.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
    return;
  }
  fs.unlinkSync(targetPath);
}

function run() {
  const options = parseArgs(process.argv.slice(2));
  const embedProfilesRoot = path.join(options.root, "content", "library", "vendor", "embed-profiles");
  const currentDirs = listCurrentDirs(embedProfilesRoot);

  if (currentDirs.length === 0) {
    console.log(`[cleanup:embed-vendor] no current dirs found under ${embedProfilesRoot}`);
    return;
  }

  const allCandidates = [];
  for (const currentDir of currentDirs) {
    allCandidates.push(...collectDuplicateCandidates(currentDir));
  }

  if (allCandidates.length === 0) {
    console.log("[cleanup:embed-vendor] no duplicate candidates found");
    return;
  }

  for (const item of allCandidates) {
    const rel = path.relative(options.root, item.duplicatePath);
    if (options.apply) {
      removePath(item.duplicatePath);
      console.log(`[cleanup:embed-vendor] removed ${rel}`);
    } else {
      console.log(`[cleanup:embed-vendor] dry-run would remove ${rel}`);
    }
  }

  const mode = options.apply ? "apply" : "dry-run";
  console.log(`[cleanup:embed-vendor] ${mode} completed: ${allCandidates.length} candidate(s)`);
}

try {
  run();
} catch (err) {
  console.error("[cleanup:embed-vendor] failed:", err && err.message ? err.message : err);
  process.exit(1);
}
