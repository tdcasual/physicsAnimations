#!/usr/bin/env node
"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function runAudit({ cwd, scope }) {
  const args = ["audit", "--omit=dev", "--json"];
  try {
    const raw = execFileSync("npm", args, { cwd, encoding: "utf8", stdio: "pipe" });
    return parseAudit(raw, scope);
  } catch (error) {
    const raw = String(error?.stdout || "").trim();
    if (!raw) {
      throw new Error(`[guard:audit] ${scope} audit command failed before producing JSON.`);
    }
    return parseAudit(raw, scope);
  }
}

function parseAudit(raw, scope) {
  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    throw new Error(`[guard:audit] ${scope} audit output is not valid JSON.`);
  }
  const vulnerabilities = report?.metadata?.vulnerabilities || {};
  const high = Number(vulnerabilities.high || 0);
  const critical = Number(vulnerabilities.critical || 0);
  const total = Number(vulnerabilities.total || 0);
  return { high, critical, total };
}

function main() {
  const rootReport = runAudit({ cwd: projectRoot, scope: "root" });
  const frontendReport = runAudit({ cwd: path.join(projectRoot, "frontend"), scope: "frontend" });

  const high = rootReport.high + frontendReport.high;
  const critical = rootReport.critical + frontendReport.critical;

  console.log(
    `[guard:audit] root(high=${rootReport.high},critical=${rootReport.critical},total=${rootReport.total}) frontend(high=${frontendReport.high},critical=${frontendReport.critical},total=${frontendReport.total})`,
  );

  if (high + critical > 0) {
    console.error(`[guard:audit] blocked: high=${high}, critical=${critical}`);
    process.exit(1);
  }
  console.log("[guard:audit] pass: no high/critical vulnerabilities.");
}

main();
