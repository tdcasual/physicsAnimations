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
  const noopItems = createNoopItemsQueryRepo();
  const noopTaxonomy = createNoopTaxonomyQueryRepo();

  return {
    itemsQueryRepo: {
      queryItems: typeof sql.queryItems === "function" ? (options) => sql.queryItems(options) : noopItems.queryItems,
      queryDynamicItems:
        typeof sql.queryDynamicItems === "function"
          ? (options) => sql.queryDynamicItems(options)
          : noopItems.queryDynamicItems,
      queryBuiltinItems:
        typeof sql.queryBuiltinItems === "function"
          ? (options) => sql.queryBuiltinItems(options)
          : noopItems.queryBuiltinItems,
      queryDynamicItemById:
        typeof sql.queryDynamicItemById === "function"
          ? (options) => sql.queryDynamicItemById(options)
          : noopItems.queryDynamicItemById,
      queryBuiltinItemById:
        typeof sql.queryBuiltinItemById === "function"
          ? (options) => sql.queryBuiltinItemById(options)
          : noopItems.queryBuiltinItemById,
    },
    taxonomyQueryRepo: {
      queryDynamicCategoryCounts:
        typeof sql.queryDynamicCategoryCounts === "function"
          ? (options) => sql.queryDynamicCategoryCounts(options)
          : noopTaxonomy.queryDynamicCategoryCounts,
      queryDynamicItemsForCatalog:
        typeof sql.queryDynamicItemsForCatalog === "function"
          ? (options) => sql.queryDynamicItemsForCatalog(options)
          : noopTaxonomy.queryDynamicItemsForCatalog,
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
