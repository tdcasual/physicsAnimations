const test = require("node:test");
const assert = require("node:assert/strict");

test("createQueryReposFromStore exposes stable items/taxonomy repos", async () => {
  const { createQueryReposFromStore } = require("../server/ports/queryRepos");

  const store = {
    stateDbQuery: {
      async queryItems() {
        return { total: 1, items: [{ id: "x" }] };
      },
      async queryDynamicCategoryCounts() {
        return { byCategory: { mechanics: 2 } };
      },
    },
  };

  const repos = createQueryReposFromStore({ store });
  assert.equal(typeof repos.itemsQueryRepo.queryItems, "function");
  assert.equal(typeof repos.taxonomyQueryRepo.queryDynamicCategoryCounts, "function");

  const items = await repos.itemsQueryRepo.queryItems({});
  assert.equal(items.total, 1);

  const counts = await repos.taxonomyQueryRepo.queryDynamicCategoryCounts({});
  assert.equal(counts.byCategory.mechanics, 2);
});

test("noop repos return deterministic empty payloads", async () => {
  const { createNoopQueryRepos } = require("../server/ports/queryRepos");
  const repos = createNoopQueryRepos();

  const items = await repos.itemsQueryRepo.queryItems({});
  assert.deepEqual(items, { total: 0, items: [] });

  const counts = await repos.taxonomyQueryRepo.queryDynamicCategoryCounts({});
  assert.deepEqual(counts, { byCategory: {} });
});
