const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseItemsState,
  parseCategoriesState,
  parseItemTombstonesState,
} = require("../server/lib/state/parsers");

test("state parsers should ignore prototype-pollution keys in object maps", () => {
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

test("parseItemsState should drop unknown item types instead of coercing to link", () => {
  const parsed = parseItemsState({
    version: 2,
    items: [
      {
        id: "x_invalid",
        type: "legacy",
        title: "invalid",
        categoryId: "other",
      },
      {
        id: "x_link",
        type: "link",
        title: "valid",
        url: "https://example.com",
        categoryId: "other",
      },
    ],
  });

  assert.equal(Array.isArray(parsed.items), true);
  assert.equal(parsed.items.some((item) => item.id === "x_invalid"), false);
  assert.equal(parsed.items.some((item) => item.id === "x_link"), true);
});
