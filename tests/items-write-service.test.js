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
      mutateItemTombstonesState: async () => null,
      normalizeCategoryId: (value) => String(value || "other"),
      noSave: createNoSave,
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
      mutateItemTombstonesState: async () => null,
      normalizeCategoryId: (value) => String(value || "other"),
      noSave: createNoSave,
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

test("updateItem rejects whitespace-only title for dynamic items", async () => {
  const { createItemsWriteService } = require("../server/services/items/writeService");

  const state = {
    items: [
      {
        id: "d2",
        type: "link",
        categoryId: "other",
        title: "Keep Title",
        description: "desc",
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
      mutateItemTombstonesState: async () => null,
      normalizeCategoryId: (value) => String(value || "other"),
      noSave: createNoSave,
      toApiItem: (item) => item,
    },
  });

  const result = await service.updateItem({
    id: "d2",
    patch: { title: "   " },
  });

  assert.equal(result?.status, 400);
  assert.equal(result?.error, "invalid_title");
  assert.equal(state.items[0].title, "Keep Title");
});

test("updateItem returns not_found for non-dynamic item id", async () => {
  const { createItemsWriteService } = require("../server/services/items/writeService");

  const service = createItemsWriteService({
    store: {},
    deps: {
      mutateItemsState: async () => null,
      mutateItemTombstonesState: async () => null,
      normalizeCategoryId: (value) => String(value || "other"),
      noSave: createNoSave,
      toApiItem: (item) => item,
    },
  });

  const result = await service.updateItem({
    id: "b1",
    patch: { title: "Updated" },
  });

  assert.equal(result?.status, 404);
  assert.equal(result?.error, "not_found");
});

test("deleteItem returns error when tombstone persistence fails", async () => {
  const { createItemsWriteService } = require("../server/services/items/writeService");

  const state = {
    items: [
      {
        id: "d1",
        type: "link",
        thumbnail: "/content/thumbnails/d1.png",
      },
    ],
  };

  const service = createItemsWriteService({
    store: {
      async deletePath() {},
    },
    deps: {
      mutateItemsState: async (_ctx, mutator) => runMutator(mutator, state),
      mutateItemTombstonesState: async () => {
        throw new Error("disk_full");
      },
      normalizeCategoryId: (value) => String(value || "other"),
      noSave: createNoSave,
      toApiItem: (item) => item,
    },
  });

  const result = await service.deleteItem({ id: "d1" });
  assert.equal(result?.status, 500);
  assert.equal(result?.error, "tombstone_persist_failed");
  assert.equal(state.items.length, 0);
});
