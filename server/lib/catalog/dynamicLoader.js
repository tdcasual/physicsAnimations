const { createError } = require("../errors");

async function loadDynamicCatalogItems({
  store: _store,
  taxonomyQueryRepo,
  includeHiddenItems = false,
  includeUnpublishedItems = false,
} = {}) {
  const queryDynamicItemsForCatalog =
    typeof taxonomyQueryRepo?.queryDynamicItemsForCatalog === "function"
      ? taxonomyQueryRepo.queryDynamicItemsForCatalog.bind(taxonomyQueryRepo)
      : null;

  if (!queryDynamicItemsForCatalog) {
    throw createError("state_db_unavailable", 503);
  }

  try {
    const sqlResult = await queryDynamicItemsForCatalog({
      includeHiddenItems,
      includeUnpublishedItems,
    });
    if (sqlResult && Array.isArray(sqlResult.items)) {
      return sqlResult;
    }
    throw new Error("invalid_sql_dynamic_catalog_payload");
  } catch {
    throw createError("state_db_unavailable", 503);
  }
}

module.exports = {
  loadDynamicCatalogItems,
};
