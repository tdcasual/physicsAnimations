const { toInt, toText } = require("../mirrorHelpers");
const {
  buildDynamicWhereClause,
  buildBuiltinWhereClause,
  buildDynamicCatalogWhereClause,
} = require("./sqlBuilders");

function createQueryRunner({ prepareQuery, mapDynamicItemRow, mapBuiltinItemRow }) {
  function queryDynamicItems({ isAdmin = false, q = "", categoryId = "", type = "", offset = 0, limit = 24 } = {}) {
    const { whereSql, params } = buildDynamicWhereClause({ isAdmin, q, categoryId, type });
    const countSql = `SELECT COUNT(1) AS total FROM state_dynamic_items ${whereSql}`;
    const totalRow = prepareQuery(countSql).get(...params);
    const total = toInt(totalRow?.total, 0);

    const safeLimit = Math.max(1, toInt(limit, 24));
    const safeOffset = Math.max(0, toInt(offset, 0));
    const dataSql = `
      SELECT
        id, type, category_id, title, description, url, path, thumbnail,
        order_value, published, hidden, upload_kind, created_at, updated_at
      FROM state_dynamic_items
      ${whereSql}
      ORDER BY created_at DESC, title COLLATE NOCASE ASC, id ASC
      LIMIT ? OFFSET ?
    `;
    const rows = prepareQuery(dataSql).all(...params, safeLimit, safeOffset);
    return { total, items: rows.map(mapDynamicItemRow) };
  }

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

  function queryBuiltinItemById({ id = "", isAdmin = false, includeDeleted = false } = {}) {
    const normalizedId = toText(id).trim();
    if (!normalizedId) return null;

    const where = ["id = ?"];
    const params = [normalizedId];
    if (!isAdmin) {
      where.push("published = 1");
      where.push("hidden = 0");
    }
    if (!includeDeleted) {
      where.push("deleted = 0");
    }

    const row = prepareQuery(
      `
        SELECT
          id, category_id, title, description, thumbnail,
          order_value, published, hidden, deleted, updated_at
        FROM state_builtin_items
        WHERE ${where.join(" AND ")}
        LIMIT 1
      `,
    ).get(...params);

    if (!row) return null;
    return mapBuiltinItemRow(row);
  }

  function queryBuiltinItems({
    isAdmin = false,
    includeDeleted = false,
    q = "",
    categoryId = "",
    type = "",
    offset = 0,
    limit = 24,
  } = {}) {
    const normalizedType = toText(type).trim();
    if (normalizedType && normalizedType !== "builtin") return { total: 0, items: [] };

    const { whereSql, params } = buildBuiltinWhereClause({ isAdmin, includeDeleted, q, categoryId });
    const countSql = `SELECT COUNT(1) AS total FROM state_builtin_items ${whereSql}`;
    const totalRow = prepareQuery(countSql).get(...params);
    const total = Math.max(0, toInt(totalRow?.total, 0));

    const safeOffset = Math.max(0, toInt(offset, 0));
    const safeLimit = Math.max(0, toInt(limit, 24));
    if (safeLimit <= 0) return { total, items: [] };

    const rows = prepareQuery(
      `
        SELECT
          id, category_id, title, description, thumbnail,
          order_value, published, hidden, deleted, updated_at
        FROM state_builtin_items
        ${whereSql}
        ORDER BY deleted ASC, title COLLATE NOCASE ASC, id ASC
        LIMIT ? OFFSET ?
      `,
    ).all(...params, safeLimit, safeOffset);

    return { total, items: rows.map(mapBuiltinItemRow) };
  }

  function queryItems({
    isAdmin = false,
    includeDeleted = false,
    q = "",
    categoryId = "",
    type = "",
    offset = 0,
    limit = 24,
  } = {}) {
    const normalizedType = toText(type).trim();
    const safeOffset = Math.max(0, toInt(offset, 0));
    const safeLimit = Math.max(0, toInt(limit, 24));

    const dynamicEnabled = !normalizedType || normalizedType === "link" || normalizedType === "upload";
    const builtinEnabled = !normalizedType || normalizedType === "builtin";
    if (!dynamicEnabled && !builtinEnabled) return { total: 0, items: [] };

    const dynamicFilter = buildDynamicWhereClause({
      isAdmin,
      q,
      categoryId,
      type: dynamicEnabled ? normalizedType : "",
    });
    const builtinFilter = buildBuiltinWhereClause({ isAdmin, includeDeleted, q, categoryId });

    const dynamicTotal = dynamicEnabled
      ? Math.max(
          0,
          toInt(prepareQuery(`SELECT COUNT(1) AS total FROM state_dynamic_items ${dynamicFilter.whereSql}`).get(...dynamicFilter.params)?.total, 0),
        )
      : 0;
    const builtinTotal = builtinEnabled
      ? Math.max(
          0,
          toInt(prepareQuery(`SELECT COUNT(1) AS total FROM state_builtin_items ${builtinFilter.whereSql}`).get(...builtinFilter.params)?.total, 0),
        )
      : 0;
    const total = dynamicTotal + builtinTotal;
    if (safeLimit <= 0 || total <= 0 || safeOffset >= total) return { total, items: [] };

    const selectParts = [];
    const selectParams = [];

    if (dynamicEnabled) {
      selectParts.push(`
        SELECT
          id,
          type,
          category_id,
          title,
          description,
          url,
          path,
          thumbnail,
          order_value,
          published,
          hidden,
          upload_kind,
          created_at,
          updated_at,
          0 AS deleted,
          0 AS source_rank
        FROM state_dynamic_items
        ${dynamicFilter.whereSql}
      `);
      selectParams.push(...dynamicFilter.params);
    }

    if (builtinEnabled) {
      selectParts.push(`
        SELECT
          id,
          'builtin' AS type,
          category_id,
          title,
          description,
          '' AS url,
          '' AS path,
          thumbnail,
          order_value,
          published,
          hidden,
          'html' AS upload_kind,
          '' AS created_at,
          updated_at,
          deleted,
          1 AS source_rank
        FROM state_builtin_items
        ${builtinFilter.whereSql}
      `);
      selectParams.push(...builtinFilter.params);
    }

    const rows = prepareQuery(
      `
        SELECT *
        FROM (
          ${selectParts.join(" UNION ALL ")}
        ) merged
        ORDER BY source_rank ASC, created_at DESC, deleted ASC, title COLLATE NOCASE ASC, id ASC
        LIMIT ? OFFSET ?
      `,
    ).all(...selectParams, safeLimit, safeOffset);

    return {
      total,
      items: rows.map((row) => (toText(row.type) === "builtin" ? mapBuiltinItemRow(row) : mapDynamicItemRow(row))),
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

    const byCategory = {};
    for (const row of rows) {
      const categoryId = toText(row?.category_id, "other").trim() || "other";
      byCategory[categoryId] = (byCategory[categoryId] || 0) + Math.max(0, toInt(row?.total, 0));
    }

    return { byCategory };
  }

  return {
    queryDynamicItems,
    queryDynamicItemsForCatalog,
    queryDynamicItemById,
    queryBuiltinItemById,
    queryBuiltinItems,
    queryItems,
    queryDynamicCategoryCounts,
  };
}

module.exports = {
  createQueryRunner,
};
