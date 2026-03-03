const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../server/app");
const { makeTempRoot, removeTempRoot } = require("./helpers/tempRoot");

test("createApp ignores READ_PATH_MODE and keeps built-in sql-only read contract", () => {
  const rootDir = makeTempRoot({ prefix: "pa-read-path-mode-" });
  const previous = process.env.READ_PATH_MODE;
  process.env.READ_PATH_MODE = "bad_mode";

  try {
    const app = createApp({ rootDir });
    assert.ok(app && typeof app.use === "function");
  } finally {
    if (previous === undefined) delete process.env.READ_PATH_MODE;
    else process.env.READ_PATH_MODE = previous;
    removeTempRoot(rootDir);
  }
});
