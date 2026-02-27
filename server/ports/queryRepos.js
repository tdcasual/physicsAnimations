function createNoopItemsQueryRepo() {
  return {
    async queryItems() {
      return { total: 0, items: [] };
    },
    async queryDynamicItems() {
      return { total: 0, items: [] };
    },
    async queryBuiltinItems() {
      return { total: 0, items: [] };
    },
    async queryDynamicItemById() {
      return null;
    },
    async queryBuiltinItemById() {
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
      queryDynamicItems:
        typeof sql.queryDynamicItems === "function"
          ? (options) => sql.queryDynamicItems(options)
          : undefined,
      queryBuiltinItems:
        typeof sql.queryBuiltinItems === "function"
          ? (options) => sql.queryBuiltinItems(options)
          : undefined,
      queryDynamicItemById:
        typeof sql.queryDynamicItemById === "function"
          ? (options) => sql.queryDynamicItemById(options)
          : undefined,
      queryBuiltinItemById:
        typeof sql.queryBuiltinItemById === "function"
          ? (options) => sql.queryBuiltinItemById(options)
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
