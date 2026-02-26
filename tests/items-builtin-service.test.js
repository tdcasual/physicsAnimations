const test = require("node:test");
const assert = require("node:assert/strict");

test("createItemsBuiltinService exposes builtin loaders", async () => {
  const {
    createItemsBuiltinService,
  } = require("../server/services/items/builtinService");

  const service = createItemsBuiltinService({
    rootDir: "/tmp/root",
    store: {},
    deps: {
      listBuiltinItems: () => [],
      findBuiltinItem: () => null,
      loadBuiltinItemsState: async () => ({ items: {} }),
      normalizeCategoryId: (value) => value || "other",
    },
  });

  assert.equal(typeof createItemsBuiltinService, "function");
  assert.equal(typeof service.loadBuiltinIndex, "function");
  assert.equal(typeof service.loadBuiltinItems, "function");
  assert.equal(typeof service.findBuiltinItemById, "function");
});

test("loadBuiltinItems merges overrides and excludes deleted by default", async () => {
  const {
    createItemsBuiltinService,
  } = require("../server/services/items/builtinService");

  const service = createItemsBuiltinService({
    rootDir: "/tmp/root",
    store: {},
    deps: {
      listBuiltinItems: () => [
        {
          id: "b1",
          categoryId: "other",
          title: "Builtin One",
          description: "D1",
          thumbnail: "thumb1",
        },
        {
          id: "b2",
          categoryId: "other",
          title: "Builtin Two",
          description: "D2",
          thumbnail: "thumb2",
        },
      ],
      findBuiltinItem: () => null,
      loadBuiltinItemsState: async () => ({
        items: {
          b1: {
            title: " Overridden ",
            categoryId: " optics ",
            published: false,
            hidden: true,
            deleted: false,
            updatedAt: "2026-02-26T00:00:00.000Z",
          },
          b2: { deleted: true },
        },
      }),
      normalizeCategoryId: (value) => String(value || "").trim() || "other",
    },
  });

  const out = await service.loadBuiltinItems();
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "b1");
  assert.equal(out[0].title, "Overridden");
  assert.equal(out[0].categoryId, "optics");
  assert.equal(out[0].published, false);
  assert.equal(out[0].hidden, true);
  assert.equal(out[0].updatedAt, "2026-02-26T00:00:00.000Z");
});

test("findBuiltinItemById respects includeDeleted", async () => {
  const {
    createItemsBuiltinService,
  } = require("../server/services/items/builtinService");

  const state = {
    items: {
      b1: { deleted: true, title: "Hidden builtin" },
    },
  };

  const service = createItemsBuiltinService({
    rootDir: "/tmp/root",
    store: {},
    deps: {
      listBuiltinItems: () => [],
      findBuiltinItem: ({ id }) => {
        if (id !== "b1") return null;
        return {
          id: "b1",
          categoryId: "other",
          title: "Builtin One",
          description: "D1",
          thumbnail: "thumb1",
        };
      },
      loadBuiltinItemsState: async () => state,
      normalizeCategoryId: (value) => value || "other",
    },
  });

  const hidden = await service.findBuiltinItemById("b1");
  assert.equal(hidden, null);

  const included = await service.findBuiltinItemById("b1", { includeDeleted: true });
  assert.equal(included.id, "b1");
  assert.equal(included.deleted, true);
  assert.equal(included.title, "Hidden builtin");
});
