const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseBuiltinItemsState,
  parseCategoriesState,
  parseItemTombstonesState,
} = require("../server/lib/state/parsers");

test("state parsers should ignore prototype-pollution keys in object maps", () => {
  const builtin = parseBuiltinItemsState(
    JSON.parse('{"version":1,"items":{"__proto__":{"title":"x"},"ok":{"title":"safe"}}}'),
  );
  assert.equal(Object.getPrototypeOf(builtin.items).title, undefined);
  assert.equal(builtin.items.ok.title, "safe");

  const categories = parseCategoriesState(
    JSON.parse(
      '{"version":2,"groups":{"__proto__":{"title":"polluted","order":0,"hidden":false},"ok":{"title":"OK","order":1,"hidden":false}},"categories":{"__proto__":{"groupId":"ok","title":"bad","order":0,"hidden":false},"c1":{"groupId":"ok","title":"Safe","order":1,"hidden":false}}}',
    ),
  );
  assert.equal(Object.getPrototypeOf(categories.groups).title, undefined);
  assert.equal(Object.getPrototypeOf(categories.categories).title, undefined);
  assert.equal(categories.groups.ok.title, "OK");
  assert.equal(categories.categories.c1.title, "Safe");

  const tombstones = parseItemTombstonesState(
    JSON.parse(
      '{"version":1,"tombstones":{"__proto__":{"deletedAt":"2026-01-01T00:00:00.000Z"},"a":{"deletedAt":"2026-01-01T00:00:00.000Z"}}}',
    ),
  );
  assert.equal(Object.getPrototypeOf(tombstones.tombstones).deletedAt, undefined);
  assert.equal(tombstones.tombstones.a.deletedAt, "2026-01-01T00:00:00.000Z");
});

