const logger = require("../../lib/logger");

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value;
}

function normalizeTypeFilter(value) {
  const type = normalizeText(value).trim();
  if (!type) return "dynamic";
  if (type === "dynamic" || type === "link" || type === "upload") return type;
  return "unsupported";
}

function unavailable() {
  return { status: 503, error: "state_db_unavailable" };
}

function createItemsReadService({ itemsQueryRepo, deps }) {
  const { toApiItem } = deps;
  const repo = itemsQueryRepo || {};

  async function listItems({ isAdmin, query }) {
    const type = normalizeTypeFilter(query.type);
    if (type === "unsupported") {
      return {
        items: [],
        page: query.page,
        pageSize: query.pageSize,
        total: 0,
      };
    }

    if (typeof repo?.queryItems !== "function") {
      return unavailable();
    }

    const q = normalizeText(query.q).trim().toLowerCase();
    const categoryId = normalizeText(query.categoryId).trim();
    const offset = (query.page - 1) * query.pageSize;

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
      return unavailable();
    }
  }

  async function getItemById({ id, isAdmin }) {
    if (typeof repo?.queryItemById !== "function") {
      return unavailable();
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
      return unavailable();
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
