const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeJsonObject } = require("../server/services/library/core/normalizers");

test("normalizeJsonObject strips prototype-pollution keys recursively", () => {
  const input = JSON.parse(
    '{"safe":1,"__proto__":{"polluted":true},"nested":{"ok":1,"constructor":{"prototype":{"x":1}}}}',
  );

  const out = normalizeJsonObject(input);
  assert.equal(out.safe, 1);
  assert.equal(out.nested.ok, 1);
  assert.equal(out.polluted, undefined);
  assert.equal(Object.getPrototypeOf(out).polluted, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(out.nested, "constructor"), false);
  assert.equal(out.nested.x, undefined);
});
