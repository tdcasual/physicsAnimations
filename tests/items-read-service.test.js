const test = require("node:test");
const assert = require("node:assert/strict");

const { createItemsReadService } = require("../server/services/items/readService");

test("createItemsReadService exposes listItems and getItemById", async () => {
  const service = createItemsReadService({
    deps: {
      toApiItem: (item) => item,
    },
  });

  assert.equal(typeof createItemsReadService, "function");
  assert.equal(typeof service.listItems, "function");
  assert.equal(typeof service.getItemById, "function");
});

test("listItems uses queryItems port when available", async () => {
  let receivedOptions = null;

  const service = createItemsReadService({
    itemsQueryRepo: {
      async queryItems(options = {}) {
        receivedOptions = options;
        return {
          total: 1,
          items: [
            {
              id: "merged_1",
              type: "link",
              categoryId: "other",
              title: "Query Item",
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
    deps: {
      toApiItem: (item) => item,
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

test("listItems keeps unsupported type behavior as empty result", async () => {
  const service = createItemsReadService({
    deps: {
      toApiItem: (item) => item,
    },
  });

  const out = await service.listItems({
    isAdmin: false,
    query: { page: 1, pageSize: 24, q: "", categoryId: "", type: "legacy" },
  });

  assert.equal(out.page, 1);
  assert.equal(out.pageSize, 24);
  assert.equal(out.total, 0);
  assert.deepEqual(out.items, []);
});

test("listItems returns state_db_unavailable when queryItems port is missing", async () => {
  const service = createItemsReadService({
    deps: {
      toApiItem: (item) => item,
    },
  });

  const out = await service.listItems({
    isAdmin: false,
    query: { page: 1, pageSize: 24, q: "", categoryId: "", type: "" },
  });

  assert.deepEqual(out, { status: 503, error: "state_db_unavailable" });
});

test("listItems returns state_db_unavailable when queryItems throws", async () => {
  const service = createItemsReadService({
    itemsQueryRepo: {
      async queryItems() {
        throw new Error("sql_items_query_failed");
      },
    },
    deps: {
      toApiItem: (item) => item,
    },
  });

  const out = await service.listItems({
    isAdmin: false,
    query: { page: 1, pageSize: 24, q: "", categoryId: "", type: "" },
  });

  assert.deepEqual(out, { status: 503, error: "state_db_unavailable" });
});

test("getItemById prefers unified queryItemById port", async () => {
  const service = createItemsReadService({
    itemsQueryRepo: {
      async queryItemById({ id, isAdmin, includeDeleted }) {
        assert.equal(id, "dyn_1");
        assert.equal(isAdmin, false);
        assert.equal(includeDeleted, false);
        return {
          id: "dyn_1",
          type: "link",
          title: "Unified",
          categoryId: "other",
          published: true,
          hidden: false,
          deleted: false,
        };
      },
    },
    deps: {
      toApiItem: (item) => item,
    },
  });

  const out = await service.getItemById({ id: "dyn_1", isAdmin: false });
  assert.equal(out?.id, "dyn_1");
  assert.equal(out?.title, "Unified");
});

test("getItemById returns state_db_unavailable when queryItemById port is missing", async () => {
  const service = createItemsReadService({
    deps: {
      toApiItem: (item) => item,
    },
  });

  const out = await service.getItemById({ id: "fallback_item_by_id", isAdmin: false });
  assert.deepEqual(out, { status: 503, error: "state_db_unavailable" });
});

test("getItemById returns state_db_unavailable when queryItemById throws", async () => {
  const service = createItemsReadService({
    itemsQueryRepo: {
      async queryItemById() {
        throw new Error("sql_item_lookup_failed");
      },
    },
    deps: {
      toApiItem: (item) => item,
    },
  });

  const out = await service.getItemById({ id: "dyn_2", isAdmin: false });
  assert.deepEqual(out, { status: 503, error: "state_db_unavailable" });
});
