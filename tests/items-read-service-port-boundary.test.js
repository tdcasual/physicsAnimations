const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("items read service binds to query-port only (no direct stateDbQuery coupling)", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "server", "services", "items", "readService.js"),
    "utf8",
  );

  assert.doesNotMatch(source, /stateDbQuery/);
});

