const test = require("node:test");
const assert = require("node:assert/strict");

function createNoSave(value) {
  return { __noSave: true, value };
}

async function runMutator(mutator, state) {
  const out = await mutator(state);
  if (out && out.__noSave) return out.value;
  return out;
}

test("createItemsWriteService exposes updateItem and deleteItem", async () => {
  const { createItemsWriteService } = require("../server/services/items/writeService");

  const service = createItemsWriteService({
    store: {},
    deps: {
      mutateItemsState: async () => null,
      mutateBuiltinItemsState: async () => null,
      mutateItemTombstonesState: async () => null,
      normalizeCategoryId: (value) => String(value || "other"),
      noSave: createNoSave,
      loadBuiltinIndex: () => [],
      findBuiltinItemById: async () => null,
      toApiItem: (item) => item,
    },
  });

  assert.equal(typeof createItemsWriteService, "function");
  assert.equal(typeof service.updateItem, "function");
  assert.equal(typeof service.deleteItem, "function");
});

test("updateItem updates dynamic item and returns updated entity", async () => {
  const { createItemsWriteService } = require("../server/services/items/writeService");

  const state = {
    items: [
      {
        id: "d1",
        type: "link",
        categoryId: "other",
        title: "Old",
        description: "Old desc",
        order: 0,
        published: true,
        hidden: false,
        updatedAt: "",
      },
    ],
  };

  const service = createItemsWriteService({
    store: {},
    deps: {
      mutateItemsState: async (_ctx, mutator) => runMutator(mutator, state),
      mutateBuiltinItemsState: async () => null,
      mutateItemTombstonesState: async () => null,
      normalizeCategoryId: (value) => String(value || "other"),
      noSave: createNoSave,
      loadBuiltinIndex: () => [],
      findBuiltinItemById: async () => null,
      toApiItem: (item) => item,
    },
  });

  const result = await service.updateItem({
    id: "d1",
    patch: { title: "New", hidden: true },
  });

  assert.equal(result.ok, true);
  assert.equal(result.item.id, "d1");
  assert.equal(result.item.title, "New");
  assert.equal(result.item.hidden, true);
  assert.equal(state.items[0].title, "New");
  assert.equal(state.items[0].hidden, true);
  assert.equal(typeof state.items[0].updatedAt, "string");
  assert.notEqual(state.items[0].updatedAt, "");
});

