const test = require("node:test");
const assert = require("node:assert/strict");

const { buildCategoriesPayload } = require("../server/lib/categoriesPayload");

test("buildCategoriesPayload uses dynamic count map and keeps stable sorting", () => {
  const catalog = {
    groups: {
      physics: {
        id: "physics",
        title: "物理",
        order: 1,
        hidden: false,
        categories: {
          mechanics: {
            id: "mechanics",
            groupId: "physics",
            title: "力学",
            order: 9,
            hidden: false,
            items: [
              { id: "b1", type: "builtin" },
              { id: "d1", type: "link" },
            ],
          },
          optics: {
            id: "optics",
            groupId: "physics",
            title: "光学",
            order: 2,
            hidden: false,
            items: [{ id: "b2", type: "builtin" }],
          },
        },
      },
      math: {
        id: "math",
        title: "数学",
        order: 5,
        hidden: false,
        categories: {
          algebra: {
            id: "algebra",
            groupId: "math",
            title: "代数",
            order: 1,
            hidden: false,
            items: [{ id: "d2", type: "link" }],
          },
        },
      },
    },
  };

  const payload = buildCategoriesPayload(catalog, {
    dynamicCountMap: {
      mechanics: 4,
      optics: 0,
      algebra: 3,
    },
  });

  assert.deepEqual(
    payload.groups.map((g) => g.id),
    ["math", "physics"],
  );
  assert.deepEqual(
    payload.categories.map((c) => c.id),
    ["algebra", "mechanics", "optics"],
  );

  const mechanics = payload.categories.find((c) => c.id === "mechanics");
  assert.equal(mechanics.builtinCount, 1);
  assert.equal(mechanics.dynamicCount, 4);
  assert.equal(mechanics.count, 5);

  const physics = payload.groups.find((g) => g.id === "physics");
  assert.equal(physics.categoryCount, 2);
  assert.equal(physics.builtinCount, 2);
  assert.equal(physics.dynamicCount, 4);
  assert.equal(physics.count, 6);
});
