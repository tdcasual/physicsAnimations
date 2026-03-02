function createNoopItemsQueryRepo() {
  return {
    async queryItems() {
      return { total: 0, items: [] };
    },
    async queryItemById() {
      return null;
    },
  };
}

function createNoopTaxonomyQueryRepo() {
  return {
    async queryDynamicCategoryCounts() {
      return { byCategory: {} };
    },
    async queryDynamicItemsForCatalog() {
      return { items: [] };
    },
  };
}

function createQueryReposFromStore({ store }) {
  const sql = store?.stateDbQuery || {};

  return {
    itemsQueryRepo: {
      queryItems: typeof sql.queryItems === "function" ? (options) => sql.queryItems(options) : undefined,
      queryItemById:
        typeof sql.queryItemById === "function"
          ? (options) => sql.queryItemById(options)
          : undefined,
    },
    taxonomyQueryRepo: {
      queryDynamicCategoryCounts:
        typeof sql.queryDynamicCategoryCounts === "function"
          ? (options) => sql.queryDynamicCategoryCounts(options)
          : undefined,
      queryDynamicItemsForCatalog:
        typeof sql.queryDynamicItemsForCatalog === "function"
          ? (options) => sql.queryDynamicItemsForCatalog(options)
          : undefined,
    },
  };
}

function createNoopQueryRepos() {
  return {
    itemsQueryRepo: createNoopItemsQueryRepo(),
    taxonomyQueryRepo: createNoopTaxonomyQueryRepo(),
  };
}

module.exports = {
  createQueryReposFromStore,
  createNoopQueryRepos,
  createNoopItemsQueryRepo,
  createNoopTaxonomyQueryRepo,
};
