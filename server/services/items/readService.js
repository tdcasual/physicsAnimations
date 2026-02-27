const logger = require("../../lib/logger");

function createItemsReadService({ store, itemsQueryRepo, deps }) {
  const {
    loadItemsState,
    loadBuiltinItems,
    findBuiltinItemById,
    toApiItem,
    safeText,
  } = deps;
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
    const supportsSqlDynamicQuery = typeof repo?.queryDynamicItems === "function";
    const supportsSqlBuiltinQuery = typeof repo?.queryBuiltinItems === "function";

    const offset = (query.page - 1) * query.pageSize;

    if (supportsSqlMergedQuery) {
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

    let dynamicItems = [];
    let dynamicTotal = 0;
    let loadedDynamicFromSql = false;

    if (supportsSqlDynamicQuery) {
      try {
        const sqlDynamic = await repo.queryDynamicItems({
          isAdmin,
          q,
          categoryId,
          type,
          offset,
          limit: query.pageSize,
        });
        dynamicItems = Array.isArray(sqlDynamic?.items) ? sqlDynamic.items : [];
        dynamicTotal = Number.isFinite(sqlDynamic?.total) ? sqlDynamic.total : dynamicItems.length;
        loadedDynamicFromSql = true;
      } catch (sqlErr) {
        logger.warn("items_sql_dynamic_query_failed", {
          fallback: "in_memory_dynamic",
          error: sqlErr,
        });
      }
    }

    if (!loadedDynamicFromSql) {
      const state = await loadItemsState({ store });
      dynamicItems = Array.isArray(state?.items) ? [...state.items] : [];
      if (!isAdmin) dynamicItems = dynamicItems.filter((it) => it.published !== false && it.hidden !== true);
      if (categoryId) dynamicItems = dynamicItems.filter((it) => it.categoryId === categoryId);
      if (type) dynamicItems = dynamicItems.filter((it) => it.type === type);
      if (q) {
        dynamicItems = dynamicItems.filter((it) => {
          const hay = `${it.title || ""}\n${it.description || ""}\n${it.url || ""}\n${it.path || ""}\n${it.id || ""}`.toLowerCase();
          return hay.includes(q);
        });
      }
      dynamicItems.sort((a, b) => {
        const timeDiff = (b.createdAt || "").localeCompare(a.createdAt || "");
        if (timeDiff) return timeDiff;
        return safeText(a.title).localeCompare(safeText(b.title), "zh-CN");
      });
      dynamicTotal = dynamicItems.length;
    }

    if (supportsSqlDynamicQuery && supportsSqlBuiltinQuery) {
      const dynamicSlice = loadedDynamicFromSql
        ? dynamicItems.slice(0, query.pageSize)
        : dynamicItems.slice(offset, offset + query.pageSize);
      const dynamicSliceCount = Math.max(0, Math.min(query.pageSize, dynamicSlice.length));
      const remaining = query.pageSize - dynamicSliceCount;
      const builtinOffset = Math.max(0, offset - dynamicTotal);

      try {
        const sqlBuiltin = await repo.queryBuiltinItems({
          isAdmin,
          includeDeleted: isAdmin,
          q,
          categoryId,
          type,
          offset: builtinOffset,
          limit: remaining,
        });

        const builtinTotal = Number.isFinite(sqlBuiltin?.total) ? sqlBuiltin.total : 0;
        const builtinSlice = Array.isArray(sqlBuiltin?.items) ? sqlBuiltin.items : [];
        const total = dynamicTotal + builtinTotal;
        const pageItems = [...dynamicSlice, ...builtinSlice].map(toApiItem);

        return { items: pageItems, page: query.page, pageSize: query.pageSize, total };
      } catch (sqlErr) {
        logger.warn("items_sql_builtin_query_failed", {
          fallback: "in_memory_builtin",
          error: sqlErr,
        });
      }
    }

    const builtinItems = await loadBuiltinItems({ includeDeleted: isAdmin });

    let filteredBuiltin = builtinItems;
    if (!isAdmin) filteredBuiltin = filteredBuiltin.filter((it) => it.published !== false && it.hidden !== true);
    if (categoryId) filteredBuiltin = filteredBuiltin.filter((it) => it.categoryId === categoryId);
    if (type) filteredBuiltin = filteredBuiltin.filter((it) => it.type === type);
    if (q) {
      filteredBuiltin = filteredBuiltin.filter((it) => {
        const hay = `${it.title || ""}\n${it.description || ""}\n${it.url || ""}\n${it.path || ""}\n${it.id || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    filteredBuiltin.sort((a, b) => {
      const timeDiff = (b.createdAt || "").localeCompare(a.createdAt || "");
      if (timeDiff) return timeDiff;
      const deletedDiff = Number(a.deleted === true) - Number(b.deleted === true);
      if (deletedDiff) return deletedDiff;
      return safeText(a.title).localeCompare(safeText(b.title), "zh-CN");
    });

    const builtinTotal = filteredBuiltin.length;
    const total = dynamicTotal + builtinTotal;

    let pageItems = [];
    if (supportsSqlDynamicQuery) {
      const dynamicSlice = loadedDynamicFromSql
        ? dynamicItems.slice(0, query.pageSize)
        : dynamicItems.slice(offset, offset + query.pageSize);
      const dynamicSliceCount = Math.max(0, Math.min(query.pageSize, dynamicSlice.length));
      const remaining = query.pageSize - dynamicSliceCount;
      const builtinOffset = Math.max(0, offset - dynamicTotal);
      const builtinSlice = remaining > 0 ? filteredBuiltin.slice(builtinOffset, builtinOffset + remaining) : [];
      pageItems = [...dynamicSlice, ...builtinSlice].map(toApiItem);
    } else {
      let items = [...dynamicItems, ...filteredBuiltin];
      items.sort((a, b) => {
        const timeDiff = (b.createdAt || "").localeCompare(a.createdAt || "");
        if (timeDiff) return timeDiff;
        const deletedDiff = Number(a.deleted === true) - Number(b.deleted === true);
        if (deletedDiff) return deletedDiff;
        return safeText(a.title).localeCompare(safeText(b.title), "zh-CN");
      });
      pageItems = items.slice(offset, offset + query.pageSize).map(toApiItem);
    }

    return { items: pageItems, page: query.page, pageSize: query.pageSize, total };
  }

  async function getItemById({ id, isAdmin }) {
    const supportsSqlDynamicItemLookup = typeof repo?.queryDynamicItemById === "function";
    const supportsSqlBuiltinItemLookup = typeof repo?.queryBuiltinItemById === "function";

    if (supportsSqlDynamicItemLookup) {
      try {
        const sqlItem = await repo.queryDynamicItemById({ id, isAdmin });
        if (sqlItem) return toApiItem(sqlItem);
      } catch (sqlErr) {
        logger.warn("items_sql_dynamic_item_lookup_failed", {
          fallback: "items_json",
          error: sqlErr,
        });
      }
    }

    const state = await loadItemsState({ store });
    const item = state.items.find((it) => it.id === id);
    if (item) {
      if (!isAdmin && (item.published === false || item.hidden === true)) return null;
      return toApiItem(item);
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
          fallback: "builtin_merge",
          error: sqlErr,
        });
      }
    }

    const builtin = await findBuiltinItemById(id, { includeDeleted: isAdmin });
    if (!builtin) return null;
    if (!isAdmin && (builtin.published === false || builtin.hidden === true)) return null;
    return toApiItem(builtin);
  }

  return {
    listItems,
    getItemById,
  };
}

module.exports = {
  createItemsReadService,
};
