const test = require("node:test");
const assert = require("node:assert/strict");

const { createSqliteMirror } = require("../server/lib/stateDb/sqliteMirror");

test("createSqliteMirror returns null when sqlite runtime is unavailable", () => {
  const mirror = createSqliteMirror({
    rootDir: process.cwd(),
    dbPath: "content/test.sqlite",
    deps: { loadNodeSqlite: () => null },
  });
  assert.equal(mirror, null);
});
