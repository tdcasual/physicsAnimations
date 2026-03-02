const { toInt, toText } = require("../mirrorHelpers");
const {
  buildDynamicWhereClause,
  buildDynamicCatalogWhereClause,
} = require("./sqlBuilders");

const FORBIDDEN_CATEGORY_IDS = new Set(["__proto__", "prototype", "constructor"]);

function normalizeCategoryId(value) {
  const categoryId = toText(value, "other").trim();
  if (!categoryId) return "other";
  if (FORBIDDEN_CATEGORY_IDS.has(categoryId)) return "other";
  return categoryId;
}

function createQueryRunner({ prepareQuery, mapDynamicItemRow }) {
  function queryDynamicItemsForCatalog({ includeHiddenItems = false, includeUnpublishedItems = false } = {}) {
    const whereSql = buildDynamicCatalogWhereClause({ includeHiddenItems, includeUnpublishedItems });
    const rows = prepareQuery(
      `
        SELECT
          id, type, category_id, title, description, url, path, thumbnail,
          order_value, published, hidden, upload_kind, created_at, updated_at
        FROM state_dynamic_items
        ${whereSql}
      `,
    ).all();
    return { items: rows.map(mapDynamicItemRow) };
  }

  function queryDynamicItemById({ id = "", isAdmin = false } = {}) {
    const normalizedId = toText(id).trim();
    if (!normalizedId) return null;

    const where = ["id = ?"];
    const params = [normalizedId];
    if (!isAdmin) {
      where.push("published = 1");
      where.push("hidden = 0");
    }

    const row = prepareQuery(
      `
        SELECT
          id, type, category_id, title, description, url, path, thumbnail,
          order_value, published, hidden, upload_kind, created_at, updated_at
        FROM state_dynamic_items
        WHERE ${where.join(" AND ")}
        LIMIT 1
      `,
    ).get(...params);

    if (!row) return null;
    return mapDynamicItemRow(row);
  }

  function queryItemById({ id = "", isAdmin = false } = {}) {
    return queryDynamicItemById({ id, isAdmin });
  }

  function queryItems({
    isAdmin = false,
    q = "",
    categoryId = "",
    type = "",
    offset = 0,
    limit = 24,
  } = {}) {
    const normalizedType = toText(type).trim();
    const safeOffset = Math.max(0, toInt(offset, 0));
    const safeLimit = Math.max(0, toInt(limit, 24));

    const dynamicOnly = normalizedType === "dynamic";
    const dynamicEnabled = dynamicOnly || !normalizedType || normalizedType === "link" || normalizedType === "upload";
    if (!dynamicEnabled) return { total: 0, items: [] };

    const dynamicFilter = buildDynamicWhereClause({
      isAdmin,
      q,
      categoryId,
      type: dynamicOnly ? "" : normalizedType,
    });
    const total = Math.max(
      0,
      toInt(prepareQuery(`SELECT COUNT(1) AS total FROM state_dynamic_items ${dynamicFilter.whereSql}`).get(...dynamicFilter.params)?.total, 0),
    );
    if (safeLimit <= 0 || total <= 0 || safeOffset >= total) return { total, items: [] };

    const rows = prepareQuery(
      `
        SELECT
          id, type, category_id, title, description, url, path, thumbnail,
          order_value, published, hidden, upload_kind, created_at, updated_at
        FROM state_dynamic_items
        ${dynamicFilter.whereSql}
        ORDER BY created_at DESC, title COLLATE NOCASE ASC, id ASC
        LIMIT ? OFFSET ?
      `,
    ).all(...dynamicFilter.params, safeLimit, safeOffset);

    return {
      total,
      items: rows.map(mapDynamicItemRow),
    };
  }

  function queryDynamicCategoryCounts({ isAdmin = false } = {}) {
    const where = [];
    if (!isAdmin) {
      where.push("published = 1");
      where.push("hidden = 0");
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = prepareQuery(
      `
        SELECT category_id, COUNT(1) AS total
        FROM state_dynamic_items
        ${whereSql}
        GROUP BY category_id
      `,
    ).all();

    const byCategory = Object.create(null);
    for (const row of rows) {
      const categoryId = normalizeCategoryId(row?.category_id);
      byCategory[categoryId] = Math.max(0, toInt(byCategory[categoryId], 0)) + Math.max(0, toInt(row?.total, 0));
    }

    return { byCategory };
  }

  return {
    queryDynamicItemsForCatalog,
    queryItemById,
    queryItems,
    queryDynamicCategoryCounts,
  };
}

module.exports = {
  createQueryRunner,
};
