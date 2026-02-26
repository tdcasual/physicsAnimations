const test = require("node:test");
const assert = require("node:assert/strict");

test("createItemsReadService exposes listItems and getItemById", async () => {
  const { createItemsReadService } = require("../server/services/items/readService");

  const service = createItemsReadService({
    store: {},
    deps: {
      loadItemsState: async () => ({ items: [] }),
      loadBuiltinItems: async () => [],
      toApiItem: (item) => item,
      safeText: (value) => String(value || ""),
    },
  });

  assert.equal(typeof createItemsReadService, "function");
  assert.equal(typeof service.listItems, "function");
  assert.equal(typeof service.getItemById, "function");
});

test("listItems prefers merged SQL query when available", async () => {
  let receivedOptions = null;
  const { createItemsReadService } = require("../server/services/items/readService");

  const service = createItemsReadService({
    store: {
      stateDbQuery: {
        async queryItems(options = {}) {
          receivedOptions = options;
          return {
            total: 1,
            items: [
              {
                id: "merged_1",
                type: "link",
                categoryId: "other",
                title: "Merged",
                description: "",
                url: "https://example.com",
                thumbnail: "",
                order: 0,
                published: true,
                hidden: false,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          };
        },
      },
    },
    deps: {
      loadItemsState: async () => {
        throw new Error("loadItemsState should not be called");
      },
      loadBuiltinItems: async () => {
        throw new Error("loadBuiltinItems should not be called");
      },
      toApiItem: (item) => item,
      safeText: (value) => String(value || ""),
    },
  });

  const out = await service.listItems({
    isAdmin: false,
    query: { page: 2, pageSize: 5, q: "abc", categoryId: "other", type: "link" },
  });

  assert.ok(receivedOptions);
  assert.equal(receivedOptions.offset, 5);
  assert.equal(receivedOptions.limit, 5);
  assert.equal(receivedOptions.q, "abc");
  assert.equal(receivedOptions.categoryId, "other");
  assert.equal(receivedOptions.type, "link");
  assert.equal(receivedOptions.includeDeleted, false);
  assert.equal(receivedOptions.isAdmin, false);

  assert.equal(out.page, 2);
  assert.equal(out.pageSize, 5);
  assert.equal(out.total, 1);
  assert.equal(out.items.length, 1);
  assert.equal(out.items[0].id, "merged_1");
});

