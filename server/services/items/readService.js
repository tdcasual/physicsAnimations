const logger = require("../../lib/logger");

function createItemsReadService({ store, itemsQueryRepo, deps }) {
  const { toApiItem } = deps;
  const repo =
    itemsQueryRepo ||
    {
      queryItems:
        typeof store?.stateDbQuery?.queryItems === "function" ? (options) => store.stateDbQuery.queryItems(options) : null,
      queryDynamicItems:
        typeof store?.stateDbQuery?.queryDynamicItems === "function"
          ? (options) => store.stateDbQuery.queryDynamicItems(options)
          : null,
      queryBuiltinItems:
        typeof store?.stateDbQuery?.queryBuiltinItems === "function"
          ? (options) => store.stateDbQuery.queryBuiltinItems(options)
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
    const supportsSqlDynamicItemLookup = typeof repo?.queryDynamicItemById === "function";
    const supportsSqlBuiltinItemLookup = typeof repo?.queryBuiltinItemById === "function";
    if (!supportsSqlDynamicItemLookup && !supportsSqlBuiltinItemLookup) {
      return { status: 503, error: "state_db_unavailable" };
    }

    if (supportsSqlDynamicItemLookup) {
      try {
        const sqlItem = await repo.queryDynamicItemById({ id, isAdmin });
        if (sqlItem) return toApiItem(sqlItem);
      } catch (sqlErr) {
        logger.warn("items_sql_dynamic_item_lookup_failed", {
          fallback: "state_db_unavailable",
          error: sqlErr,
        });
        return { status: 503, error: "state_db_unavailable" };
      }
    }

    if (supportsSqlBuiltinItemLookup) {
      try {
        const sqlBuiltin = await repo.queryBuiltinItemById({
          id,
          isAdmin,
          includeDeleted: isAdmin,
        });
        if (sqlBuiltin) return toApiItem(sqlBuiltin);
      } catch (sqlErr) {
        logger.warn("items_sql_builtin_item_lookup_failed", {
          fallback: "state_db_unavailable",
          error: sqlErr,
        });
        return { status: 503, error: "state_db_unavailable" };
      }
    }

    return null;
  }

  return {
    listItems,
    getItemById,
  };
}

module.exports = {
  createItemsReadService,
};
