const test = require("node:test");
const assert = require("node:assert/strict");

const {
  toInt,
  toText,
  toBooleanStrict,
  parseBooleanLike,
} = require("../server/lib/shared/normalizers");

test("toInt normalizes finite numbers and applies fallback", () => {
  assert.equal(toInt("12", 0), 12);
  assert.equal(toInt(12.9, 0), 12);
  assert.equal(toInt("x", 7), 7);
  assert.equal(toInt(undefined, 9), 9);
});

test("toText keeps strings and applies fallback for non-string", () => {
  assert.equal(toText("abc", ""), "abc");
  assert.equal(toText(123, "fallback"), "fallback");
});

test("toBooleanStrict accepts boolean only", () => {
  assert.equal(toBooleanStrict(true, false), true);
  assert.equal(toBooleanStrict(false, true), false);
  assert.equal(toBooleanStrict("true", false), false);
  assert.equal(toBooleanStrict(1, false), false);
});

test("parseBooleanLike parses common boolean text with fallback", () => {
  assert.equal(parseBooleanLike("true", false), true);
  assert.equal(parseBooleanLike("off", true), false);
  assert.equal(parseBooleanLike("", true), true);
  assert.equal(parseBooleanLike(undefined, false), false);
  assert.equal(parseBooleanLike("unknown", true), true);
});
