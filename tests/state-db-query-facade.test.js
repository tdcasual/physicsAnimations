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
    ensureBuiltinItemsIndexed: async () => {
      calls.push("ensureBuiltin");
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
  assert.deepEqual(calls, ["ensureUsable", "ensureDynamic", "ensureBuiltin", "mirror.queryItems"]);
});
