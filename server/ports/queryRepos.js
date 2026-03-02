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
  const queryItemById =
    typeof sql.queryItemById === "function"
      ? (options) => sql.queryItemById(options)
      : typeof sql.queryDynamicItemById === "function" || typeof sql.queryBuiltinItemById === "function"
        ? async (options = {}) => {
            const id = String(options.id || "");
            const isAdmin = options.isAdmin === true;
            const includeDeleted = options.includeDeleted === true;

            if (typeof sql.queryDynamicItemById === "function") {
              const dynamicItem = await sql.queryDynamicItemById({ id, isAdmin });
              if (dynamicItem) return dynamicItem;
            }

            if (typeof sql.queryBuiltinItemById === "function") {
              return sql.queryBuiltinItemById({ id, isAdmin, includeDeleted });
            }

            return null;
          }
        : undefined;

  return {
    itemsQueryRepo: {
      queryItems: typeof sql.queryItems === "function" ? (options) => sql.queryItems(options) : undefined,
      queryItemById,
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
