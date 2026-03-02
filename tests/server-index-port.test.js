const test = require("node:test");
const assert = require("node:assert/strict");

const { parsePort } = require("../server/index");

test("parsePort keeps valid explicit port", () => {
  assert.equal(parsePort("4173"), 4173);
  assert.equal(parsePort(" 4173 "), 4173);
  assert.equal(parsePort("0"), 0);
  assert.equal(parsePort("65535"), 65535);
});

test("parsePort falls back for invalid values", () => {
  assert.equal(parsePort("abc"), 4173);
  assert.equal(parsePort("4173abc", 3000), 3000);
  assert.equal(parsePort("-1"), 4173);
  assert.equal(parsePort("65536"), 4173);
  assert.equal(parsePort("", 3000), 3000);
});
