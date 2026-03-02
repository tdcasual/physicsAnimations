const logger = require("../../lib/logger");

function createQueryItemByIdAdapter(repo) {
  if (!repo || typeof repo !== "object") return null;
  const dynamicLookup =
    typeof repo.queryDynamicItemById === "function" ? (options) => repo.queryDynamicItemById(options) : null;
  const builtinLookup =
    typeof repo.queryBuiltinItemById === "function" ? (options) => repo.queryBuiltinItemById(options) : null;
  if (!dynamicLookup && !builtinLookup) return null;

  return async ({ id, isAdmin, includeDeleted }) => {
    if (dynamicLookup) {
      const dynamicItem = await dynamicLookup({ id, isAdmin });
      if (dynamicItem) return dynamicItem;
    }
    if (builtinLookup) return builtinLookup({ id, isAdmin, includeDeleted });
    return null;
  };
}

function createItemsReadService({ store, itemsQueryRepo, deps }) {
  const { toApiItem } = deps;
  const sourceRepo =
    itemsQueryRepo ||
    {
      queryItems:
        typeof store?.stateDbQuery?.queryItems === "function" ? (options) => store.stateDbQuery.queryItems(options) : null,
      queryItemById:
        typeof store?.stateDbQuery?.queryItemById === "function"
          ? (options) => store.stateDbQuery.queryItemById(options)
          : null,
      queryDynamicItemById:
        typeof store?.stateDbQuery?.queryDynamicItemById === "function"
          ? (options) => store.stateDbQuery.queryDynamicItemById(options)
          : null,
      queryBuiltinItemById:
        typeof store?.stateDbQuery?.queryBuiltinItemById === "function"
          ? (options) => store.stateDbQuery.queryBuiltinItemById(options)
          : null,
    };
  const repo = {
    queryItems: typeof sourceRepo?.queryItems === "function" ? (options) => sourceRepo.queryItems(options) : null,
    queryItemById:
      typeof sourceRepo?.queryItemById === "function"
        ? (options) => sourceRepo.queryItemById(options)
        : createQueryItemByIdAdapter(sourceRepo),
  };

  async function listItems({ isAdmin, query }) {
    const q = (query.q || "").trim().toLowerCase();
    const categoryId = (query.categoryId || "").trim();
    const type = (query.type || "").trim();
    const supportsSqlMergedQuery = typeof repo?.queryItems === "function";

    const offset = (query.page - 1) * query.pageSize;

    if (!supportsSqlMergedQuery) return { status: 503, error: "state_db_unavailable" };

    try {
      const sqlMerged = await repo.queryItems({
        isAdmin,
        includeDeleted: isAdmin,
        q,
        categoryId,
        type,
        offset,
        limit: query.pageSize,
      });

      const total = Number.isFinite(sqlMerged?.total) ? sqlMerged.total : 0;
      const items = Array.isArray(sqlMerged?.items) ? sqlMerged.items : [];
      return {
        items: items.map(toApiItem),
        page: query.page,
        pageSize: query.pageSize,
        total,
      };
    } catch (sqlErr) {
      logger.warn("items_sql_merged_query_failed", {
        fallback: "state_db_unavailable",
        error: sqlErr,
      });
      return { status: 503, error: "state_db_unavailable" };
    }
  }

  async function getItemById({ id, isAdmin }) {
    const supportsItemLookup = typeof repo?.queryItemById === "function";
    if (!supportsItemLookup) {
      return { status: 503, error: "state_db_unavailable" };
    }

    try {
      const sqlItem = await repo.queryItemById({
        id,
        isAdmin,
        includeDeleted: isAdmin,
      });
      if (sqlItem) return toApiItem(sqlItem);
      return null;
    } catch (sqlErr) {
      logger.warn("items_sql_item_lookup_failed", {
        fallback: "state_db_unavailable",
        error: sqlErr,
      });
      return { status: 503, error: "state_db_unavailable" };
    }
  }

  return {
    listItems,
    getItemById,
  };
}

module.exports = {
  createItemsReadService,
};
