const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("loading node:sqlite through helper does not print experimental warning", () => {
  const script = [
    "const { loadNodeSqlite } = require('./server/lib/nodeSqlite');",
    "const sqlite = loadNodeSqlite();",
    "if (sqlite && typeof sqlite.DatabaseSync !== 'function') process.exit(2);",
  ].join("\n");

  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.doesNotMatch(result.stderr || "", /SQLite is an experimental feature/i);
});
