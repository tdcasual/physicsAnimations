const logger = require("../../lib/logger");

function createItemsReadService({ itemsQueryRepo, deps }) {
  const { toApiItem } = deps;
  const repo = itemsQueryRepo || {};

  async function listItems({ isAdmin, query }) {
    const q = (query.q || "").trim().toLowerCase();
    const categoryId = (query.categoryId || "").trim();
    const requestedType = (query.type || "").trim();
    const type = requestedType || "dynamic";
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
        failureStage: "queryItems",
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
      if (!sqlItem || (sqlItem.type !== "link" && sqlItem.type !== "upload")) return null;
      return toApiItem(sqlItem);
    } catch (sqlErr) {
      logger.warn("items_sql_item_lookup_failed", {
        failureStage: "queryItemById",
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
