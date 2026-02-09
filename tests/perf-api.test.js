const test = require("node:test");
const assert = require("node:assert/strict");

const DEFAULT_SCALE = {
  items: 2000,
  categories: 80,
  groups: 5,
};

function makeSeededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function buildFixture(scale = DEFAULT_SCALE) {
  const rng = makeSeededRng(42);
  const groups = Array.from({ length: scale.groups }, (_, i) => ({
    id: `g${i + 1}`,
    title: `Group ${i + 1}`,
    order: i,
    hidden: false,
  }));

  const categories = Array.from({ length: scale.categories }, (_, i) => {
    const groupId = groups[i % groups.length].id;
    return {
      id: `c${i + 1}`,
      groupId,
      title: `Category ${i + 1}`,
      order: i,
      hidden: false,
    };
  });

  const items = Array.from({ length: scale.items }, (_, i) => {
    const category = categories[Math.floor(rng() * categories.length)];
    return {
      id: `item_${i + 1}`,
      categoryId: category.id,
    };
  });

  return { items, categories, groups };
}

test("perf fixture matches scale B", () => {
  const fixture = buildFixture();
  assert.equal(fixture.items.length, 2000);
});
