const { loadItemsState } = require("../state");
const logger = require("../logger");

async function loadDynamicCatalogItems({
  store,
  taxonomyQueryRepo,
  includeHiddenItems = false,
  includeUnpublishedItems = false,
} = {}) {
  const queryDynamicItemsForCatalog =
    typeof taxonomyQueryRepo?.queryDynamicItemsForCatalog === "function"
      ? (options) => taxonomyQueryRepo.queryDynamicItemsForCatalog(options)
      : typeof store?.stateDbQuery?.queryDynamicItemsForCatalog === "function"
        ? (options) => store.stateDbQuery.queryDynamicItemsForCatalog(options)
        : null;

  if (queryDynamicItemsForCatalog) {
    try {
      const sqlResult = await queryDynamicItemsForCatalog({
        includeHiddenItems,
        includeUnpublishedItems,
      });
      if (sqlResult && Array.isArray(sqlResult.items)) {
        return sqlResult;
      }
    } catch (err) {
      logger.warn("catalog_sql_dynamic_query_failed", {
        fallback: "items_json",
        error: err,
      });
    }
  }

  return loadItemsState({ store });
}

module.exports = {
  loadDynamicCatalogItems,
};
