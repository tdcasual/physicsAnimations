const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.join(__dirname, "..");

function readUtf8(relPath) {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), "utf8");
}

test("package.json and frontend/package.json declare Node >=24 engines", () => {
  const rootPkg = JSON.parse(readUtf8("package.json"));
  const frontendPkg = JSON.parse(readUtf8("frontend/package.json"));

  assert.equal(rootPkg.engines?.node, ">=24");
  assert.equal(frontendPkg.engines?.node, ">=24");

  const nodeTypesVersion = String(frontendPkg.devDependencies?.["@types/node"] || "");
  assert.match(nodeTypesVersion, /^\^24(\.|$)/);
});

test("frontend test script preloads localStorage shim for Node worker stability", () => {
  const frontendPkg = JSON.parse(readUtf8("frontend/package.json"));
  const script = String(frontendPkg.scripts?.test || "");
  assert.match(script, /--import\s+\.\/test\/node-localstorage-shim\.mjs/);
});

test(".dockerignore excludes local dependency directories used during image builds", () => {
  const dockerignore = readUtf8(".dockerignore");
  assert.match(dockerignore, /^node_modules\/?$/m);
  assert.match(dockerignore, /^frontend\/node_modules\/?$/m);
});

test("Dockerfile uses Node 24 base images for all stages", () => {
  const dockerfile = readUtf8("Dockerfile");
  const fromLines = dockerfile
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("FROM "));

  assert.ok(fromLines.length >= 3, "expected multi-stage Dockerfile");
  for (const line of fromLines) {
    assert.match(line, /^FROM (node:24-bookworm-slim|runtime-base) /i);
  }
});

test("Dockerfile keeps browser runtime in a dedicated target", () => {
  const dockerfile = readUtf8("Dockerfile");

  assert.match(dockerfile, /^FROM node:24-bookworm-slim AS runtime-base$/m);
  assert.match(dockerfile, /^FROM runtime-base AS runtime-browser$/m);
  assert.match(dockerfile, /^FROM runtime-base AS runtime$/m);

  const runtimeBaseSection = dockerfile.match(/^FROM node:24-bookworm-slim AS runtime-base$([\s\S]*?)(?=^FROM runtime-base AS runtime-browser$)/m);
  assert.ok(runtimeBaseSection, "expected runtime-base section before runtime-browser stage");
  assert.doesNotMatch(runtimeBaseSection[1], /playwright install --with-deps chromium/);

  const runtimeBrowserSection = dockerfile.match(/^FROM runtime-base AS runtime-browser$([\s\S]*?)(?=^FROM runtime-base AS runtime$)/m);
  assert.ok(runtimeBrowserSection, "expected runtime-browser section");
  assert.match(runtimeBrowserSection[1], /playwright install --with-deps chromium/);
});

test("GitHub Actions setup-node uses Node 24", () => {
  const workflow = readUtf8(".github/workflows/docker-image.yml");
  const setupNodeMatches = [...workflow.matchAll(/node-version:\s*"?(\d+)"?/g)];
  assert.ok(setupNodeMatches.length >= 1, "expected at least one setup-node version declaration");
  for (const match of setupNodeMatches) {
    assert.equal(match[1], "24");
  }
});

test("GitHub Actions publishes the lean runtime target by default", () => {
  const workflow = readUtf8(".github/workflows/docker-image.yml");
  assert.match(workflow, /target:\s*runtime/);
});

test(".nvmrc and .node-version pin local runtime to Node 24", () => {
  const nvmrc = readUtf8(".nvmrc").trim();
  assert.equal(nvmrc, "24");

  const nodeVersion = readUtf8(".node-version").trim();
  assert.equal(nodeVersion, "24");
});
