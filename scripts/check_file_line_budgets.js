#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const configPath = path.join(projectRoot, "config", "file-line-budgets.json");

function toPosix(value) {
  return String(value || "").split(path.sep).join("/");
}

function listFilesRecursive(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const results = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function readConfig() {
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  const rules = Array.isArray(parsed?.rules) ? parsed.rules : [];
  const overrides = parsed?.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {};
  return { rules, overrides };
}

function isFileInRoot(relativePath, rootPath) {
  if (relativePath === rootPath) return true;
  return relativePath.startsWith(`${rootPath}/`);
}

function countLines(filePath) {
  return fs.readFileSync(filePath, "utf8").split("\n").length;
}

function run() {
  const { rules, overrides } = readConfig();
  if (rules.length === 0) {
    console.error("[guard:file-size] no rules found in config/file-line-budgets.json");
    process.exit(1);
  }

  const violations = [];
  const checked = [];
  const seen = new Set();

  for (const rule of rules) {
    const root = toPosix(rule?.root);
    const exts = Array.isArray(rule?.extensions) ? rule.extensions.map((ext) => String(ext || "")) : [];
    const maxLines = Number(rule?.maxLines || 0);

    if (!root || exts.length === 0 || !Number.isFinite(maxLines) || maxLines <= 0) {
      console.error("[guard:file-size] invalid rule:", rule);
      process.exit(1);
    }

    const absoluteRoot = path.join(projectRoot, root);
    const files = listFilesRecursive(absoluteRoot);

    for (const file of files) {
      const relativePath = toPosix(path.relative(projectRoot, file));
      if (!isFileInRoot(relativePath, root)) continue;
      if (!exts.some((ext) => relativePath.endsWith(ext))) continue;
      if (seen.has(relativePath)) continue;
      seen.add(relativePath);

      const lineCount = countLines(file);
      const fileLimit = Number(overrides[relativePath] || maxLines);
      checked.push({ relativePath, lineCount, fileLimit });
      if (lineCount > fileLimit) {
        violations.push({ relativePath, lineCount, fileLimit });
      }
    }
  }

  if (violations.length > 0) {
    console.error("[guard:file-size] file line budget violations:");
    for (const item of violations.sort((a, b) => b.lineCount - a.lineCount)) {
      console.error(`  - ${item.relativePath}: ${item.lineCount} lines (limit ${item.fileLimit})`);
    }
    process.exit(1);
  }

  const checkedCount = checked.length;
  const topFiles = checked
    .slice()
    .sort((a, b) => b.lineCount - a.lineCount)
    .slice(0, 5)
    .map((item) => `${item.relativePath}=${item.lineCount}/${item.fileLimit}`)
    .join(", ");

  console.log(`[guard:file-size] checked ${checkedCount} files; all within budget.`);
  if (topFiles) {
    console.log(`[guard:file-size] top files: ${topFiles}`);
  }
}

run();
