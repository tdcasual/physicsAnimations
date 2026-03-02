const test = require("node:test");
const assert = require("node:assert/strict");

const { createStateDbQueryFacade } = require("../server/lib/stateDb/queryFacade");

test("query facade delegates through ensure+run wrappers", async () => {
  const calls = [];
  const facade = createStateDbQueryFacade({
    mirror: {
      queryItems: () => ({ total: 0, items: [] }),
    },
    ensureDynamicItemsIndexed: async () => {
      calls.push("ensureDynamic");
    },
    runMirrorOperation: (operation, fn) => {
      calls.push(operation);
      return fn();
    },
    ensureUsable: () => {
      calls.push("ensureUsable");
    },
  });

  await facade.queryItems({});
  assert.deepEqual(calls, ["ensureUsable", "ensureDynamic", "mirror.queryItems"]);
  assert.equal(facade.queryDynamicItems, undefined);
  assert.equal(facade.queryBuiltinItems, undefined);
  assert.equal(facade.queryDynamicItemById, undefined);
  assert.equal(facade.queryBuiltinItemById, undefined);
});

test("query facade exposes unified queryItemById and prefers dynamic item", async () => {
  const calls = [];
  const facade = createStateDbQueryFacade({
    mirror: {
      queryItemById: ({ id }) => (id === "dyn_1" ? { id: "dyn_1", type: "link" } : null),
    },
    ensureDynamicItemsIndexed: async () => {
      calls.push("ensureDynamic");
    },
    runMirrorOperation: (operation, fn) => {
      calls.push(operation);
      return fn();
    },
    ensureUsable: () => {
      calls.push("ensureUsable");
    },
  });

  const item = await facade.queryItemById({ id: "dyn_1", isAdmin: false, includeDeleted: false });
  assert.equal(item?.id, "dyn_1");
  assert.deepEqual(calls, [
    "ensureUsable",
    "ensureDynamic",
    "mirror.queryItemById",
  ]);
});
