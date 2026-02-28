#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const configPath = path.join(projectRoot, "config", "security-guard-patterns.json");

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

function loadConfig() {
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  const rules = Array.isArray(parsed?.rules) ? parsed.rules : [];
  const allowMatches = Array.isArray(parsed?.allowMatches) ? parsed.allowMatches.map((item) => String(item || "")) : [];
  return { rules, allowMatches };
}

function shouldAllow(relativePath, allowMatches) {
  const normalized = toPosix(relativePath);
  return allowMatches.some((item) => normalized.includes(item));
}

function run() {
  const { rules, allowMatches } = loadConfig();
  if (rules.length === 0) {
    console.error("[guard:security] no rules configured.");
    process.exit(1);
  }

  const violations = [];
  let checkedCount = 0;

  for (const rule of rules) {
    const roots = Array.isArray(rule?.roots) ? rule.roots.map((item) => toPosix(item)) : [];
    const extensions = Array.isArray(rule?.extensions) ? rule.extensions.map((item) => String(item || "")) : [];
    const name = String(rule?.name || "");
    const message = String(rule?.message || "");
    const patternText = String(rule?.pattern || "");

    if (!name || !patternText || roots.length === 0 || extensions.length === 0) {
      console.error("[guard:security] invalid rule:", rule);
      process.exit(1);
    }

    const pattern = new RegExp(patternText, "m");

    for (const root of roots) {
      const absoluteRoot = path.join(projectRoot, root);
      const files = listFilesRecursive(absoluteRoot);
      for (const filePath of files) {
        const relativePath = toPosix(path.relative(projectRoot, filePath));
        if (!extensions.some((ext) => relativePath.endsWith(ext))) continue;
        if (shouldAllow(relativePath, allowMatches)) continue;
        checkedCount += 1;
        const source = fs.readFileSync(filePath, "utf8");
        if (pattern.test(source)) {
          violations.push({
            rule: name,
            file: relativePath,
            message,
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("[guard:security] blocked risky source patterns:");
    for (const violation of violations) {
      console.error(`  - [${violation.rule}] ${violation.file}: ${violation.message}`);
    }
    process.exit(1);
  }

  console.log(`[guard:security] checked ${checkedCount} files; no blocked patterns found.`);
}

run();
