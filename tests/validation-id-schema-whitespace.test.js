const test = require("node:test");
const assert = require("node:assert/strict");

const { parseWithSchema, idSchema } = require("../server/lib/validation");

test("idSchema rejects whitespace-only IDs", () => {
  assert.throws(
    () => parseWithSchema(idSchema, "   "),
    (err) => err && err.message === "invalid_input" && err.status === 400,
  );
});
