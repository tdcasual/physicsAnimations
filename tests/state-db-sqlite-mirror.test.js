const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createSqliteMirror } = require("../server/lib/stateDb/sqliteMirror");

test("createSqliteMirror returns null when sqlite runtime is unavailable", () => {
  const mirror = createSqliteMirror({
    rootDir: process.cwd(),
    dbPath: "content/test.sqlite",
    deps: { loadNodeSqlite: () => null },
  });
  assert.equal(mirror, null);
});

test("stateDb entry keeps orchestration-only surface for mode/mirror wiring", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "server/lib/stateDb.js"), "utf8");
  assert.equal(source.includes("function createSqliteMirror("), false);
  assert.equal(source.includes("function normalizeStateDbMode("), false);
});
