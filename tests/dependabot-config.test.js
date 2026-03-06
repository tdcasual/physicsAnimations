const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.join(__dirname, "..");

function readUtf8(relPath) {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), "utf8");
}

test("dependabot config covers root and frontend npm workspaces weekly", () => {
  const content = readUtf8(".github/dependabot.yml");

  assert.match(content, /^version:\s*2\s*$/m);
  assert.match(content, /package-ecosystem:\s*"npm"/);
  assert.match(content, /directory:\s*"\/"/);
  assert.match(content, /directory:\s*"\/frontend"/);

  const weeklyMatches = [...content.matchAll(/interval:\s*"weekly"/g)];
  assert.equal(weeklyMatches.length, 2);
});
