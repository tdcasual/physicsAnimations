const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../server/app");
const { parseReadPathMode } = require("../server/lib/readPathMode");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");

test("parseReadPathMode defaults to sql_only", () => {
  assert.equal(parseReadPathMode(undefined), "sql_only");
  assert.equal(parseReadPathMode(""), "sql_only");
});

test("parseReadPathMode accepts sql_only only", () => {
  assert.equal(parseReadPathMode("sql_only"), "sql_only");
  assert.equal(parseReadPathMode(" SQL_ONLY "), "sql_only");
  assert.throws(() => parseReadPathMode("dual"), /invalid_read_path_mode/);
});

test("createApp rejects invalid READ_PATH_MODE value", () => {
  const rootDir = makeTempRoot({ prefix: "pa-read-path-mode-" });
  const previous = process.env.READ_PATH_MODE;
  process.env.READ_PATH_MODE = "bad_mode";

  try {
    assert.throws(() => createApp({ rootDir }), /invalid_read_path_mode/);
  } finally {
    if (previous === undefined) delete process.env.READ_PATH_MODE;
    else process.env.READ_PATH_MODE = previous;
    removeTempRoot(rootDir);
  }
});
