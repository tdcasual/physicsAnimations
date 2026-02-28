const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.join(__dirname, "..");

function readUtf8(relPath) {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), "utf8");
}

test("package.json and frontend/package.json declare Node 24 engines", () => {
  const rootPkg = JSON.parse(readUtf8("package.json"));
  const frontendPkg = JSON.parse(readUtf8("frontend/package.json"));

  assert.equal(rootPkg.engines?.node, ">=24 <25");
  assert.equal(frontendPkg.engines?.node, ">=24 <25");

  const nodeTypesVersion = String(frontendPkg.devDependencies?.["@types/node"] || "");
  assert.match(nodeTypesVersion, /^\^24(\.|$)/);
});

test("Dockerfile uses Node 24 base images for all stages", () => {
  const dockerfile = readUtf8("Dockerfile");
  const fromLines = dockerfile
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("FROM "));

  assert.ok(fromLines.length >= 2, "expected multi-stage Dockerfile");
  for (const line of fromLines) {
    assert.match(line, /^FROM node:24-bookworm-slim/i);
  }
});

test("GitHub Actions setup-node uses Node 24", () => {
  const workflow = readUtf8(".github/workflows/docker-image.yml");
  const setupNodeMatches = [...workflow.matchAll(/node-version:\s*"?(\d+)"?/g)];
  assert.ok(setupNodeMatches.length >= 2, "expected at least two setup-node version declarations");
  for (const match of setupNodeMatches) {
    assert.equal(match[1], "24");
  }
});

test(".nvmrc and .node-version pin local runtime to Node 24", () => {
  const nvmrc = readUtf8(".nvmrc").trim();
  assert.equal(nvmrc, "24");

  const nodeVersion = readUtf8(".node-version").trim();
  assert.equal(nodeVersion, "24");
});
