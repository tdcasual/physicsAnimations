const { loadItemsState } = require("../state");
const { createError } = require("../errors");

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
    } catch {}
    throw createError("state_db_unavailable", 503);
  }

  return loadItemsState({ store });
}

module.exports = {
  loadDynamicCatalogItems,
};
