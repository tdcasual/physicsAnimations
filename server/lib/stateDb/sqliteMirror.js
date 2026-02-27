const fs = require("fs");
const path = require("path");
const { loadNodeSqlite } = require("../nodeSqlite");
const {
  toInt,
  toText,
  parseDynamicItemsFromBuffer,
  parseBuiltinOverridesFromBuffer,
  loadBuiltinBaseRows,
  normalizeStateDbMode,
  normalizeKey,
  resolveDbPath,
} = require("./mirrorHelpers");

function createSqliteMirror({ rootDir, dbPath, deps = {} }) {
  const loadSqlite = typeof deps.loadNodeSqlite === "function" ? deps.loadNodeSqlite : loadNodeSqlite;
  const sqlite = loadSqlite();
  if (!sqlite) return null;

  const DatabaseSync = sqlite?.DatabaseSync;
  if (typeof DatabaseSync !== "function") return null;

  const filePath = resolveDbPath({ rootDir, dbPath });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const db = new DatabaseSync(filePath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec(
    "CREATE TABLE IF NOT EXISTS state_blobs (key TEXT PRIMARY KEY, value BLOB NOT NULL, updated_at TEXT NOT NULL)",
  );
  db.exec(`
    CREATE TABLE IF NOT EXISTS state_dynamic_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      category_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      path TEXT NOT NULL,
      thumbnail TEXT NOT NULL,
      order_value INTEGER NOT NULL,
      published INTEGER NOT NULL,
      hidden INTEGER NOT NULL,
      upload_kind TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_state_dynamic_items_type ON state_dynamic_items(type)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_state_dynamic_items_category ON state_dynamic_items(category_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_state_dynamic_items_visibility ON state_dynamic_items(published, hidden)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_state_dynamic_items_created ON state_dynamic_items(created_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_state_dynamic_items_sort ON state_dynamic_items(created_at DESC, title COLLATE NOCASE, id)");
  db.exec(`
    CREATE TABLE IF NOT EXISTS state_builtin_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      thumbnail TEXT NOT NULL,
      order_value INTEGER NOT NULL,
      published INTEGER NOT NULL,
      hidden INTEGER NOT NULL,
      deleted INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_state_builtin_items_category ON state_builtin_items(category_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_state_builtin_items_visibility ON state_builtin_items(published, hidden, deleted)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_state_builtin_items_sort ON state_builtin_items(deleted, title COLLATE NOCASE, id)");

  const statementCache = new Map();
  function prepareQuery(sql) {
    let stmt = statementCache.get(sql);
    if (!stmt) {
      stmt = db.prepare(sql);
      statementCache.set(sql, stmt);
    }
    return stmt;
  }
  const selectStmt = prepareQuery("SELECT value FROM state_blobs WHERE key = ?");
  const upsertStmt = prepareQuery(
    "INSERT INTO state_blobs (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
  );
  const deleteStmt = prepareQuery("DELETE FROM state_blobs WHERE key = ?");
  const clearDynamicStmt = prepareQuery("DELETE FROM state_dynamic_items");
  const countDynamicStmt = prepareQuery("SELECT COUNT(1) as total FROM state_dynamic_items");
  const insertDynamicStmt = prepareQuery(`
    INSERT INTO state_dynamic_items (
      id, type, category_id, title, description, url, path, thumbnail,
      order_value, published, hidden, upload_kind, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const clearBuiltinStmt = prepareQuery("DELETE FROM state_builtin_items");
  const countBuiltinStmt = prepareQuery("SELECT COUNT(1) as total FROM state_builtin_items");
  const insertBuiltinStmt = prepareQuery(`
    INSERT INTO state_builtin_items (
      id, category_id, title, description, thumbnail,
      order_value, published, hidden, deleted, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  function syncDynamicItemsFromBuffer(buffer) {
    const rows = parseDynamicItemsFromBuffer(buffer);
    db.exec("BEGIN IMMEDIATE");
    try {
      clearDynamicStmt.run();
      for (const row of rows) {
        insertDynamicStmt.run(
          row.id,
          row.type,
          row.categoryId,
          row.title,
          row.description,
          row.url,
          row.path,
          row.thumbnail,
          row.order,
          row.published ? 1 : 0,
          row.hidden ? 1 : 0,
          row.uploadKind,
          row.createdAt,
          row.updatedAt,
        );
      }
      db.exec("COMMIT");
    } catch (err) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // ignore
      }
      throw err;
    }
  }

  function syncBuiltinItems({ rootDir, builtinOverridesBuffer }) {
    const baseRows = loadBuiltinBaseRows({ rootDir });
    const overrides = parseBuiltinOverridesFromBuffer(builtinOverridesBuffer);

    db.exec("BEGIN IMMEDIATE");
    try {
      clearBuiltinStmt.run();
      for (const base of baseRows) {
        const override = overrides[base.id] || {};

        const categoryId = toText(override.categoryId, base.categoryId).trim() || base.categoryId;
        const title = toText(override.title, base.title);
        const description = Object.prototype.hasOwnProperty.call(override, "description")
          ? toText(override.description)
          : base.description;
        const thumbnail = base.thumbnail;
        const order = Number.isFinite(override.order) ? Math.trunc(override.order) : base.order;
        const published =
          typeof override.published === "boolean" ? override.published : base.published;
        const hidden = typeof override.hidden === "boolean" ? override.hidden : base.hidden;
        const deleted = override.deleted === true;
        const updatedAt = toText(override.updatedAt, base.updatedAt);

        insertBuiltinStmt.run(
          base.id,
          categoryId,
          title,
          description,
          thumbnail,
          order,
          published ? 1 : 0,
          hidden ? 1 : 0,
          deleted ? 1 : 0,
          updatedAt,
        );
      }
      db.exec("COMMIT");
    } catch (err) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // ignore
      }
      throw err;
    }
  }

  function mapBuiltinItemRow(row) {
    return {
      id: toText(row.id),
      type: "builtin",
      categoryId: toText(row.category_id, "other") || "other",
      title: toText(row.title),
      description: toText(row.description),
      thumbnail: toText(row.thumbnail),
      order: toInt(row.order_value, 0),
      published: toInt(row.published, 0) === 1,
      hidden: toInt(row.hidden, 0) === 1,
      deleted: toInt(row.deleted, 0) === 1,
      createdAt: "",
      updatedAt: toText(row.updated_at),
    };
  }

  function mapDynamicItemRow(row) {
    const itemType = toText(row.type);
    return {
      id: toText(row.id),
      type: itemType,
      categoryId: toText(row.category_id, "other") || "other",
      title: toText(row.title),
      description: toText(row.description),
      thumbnail: toText(row.thumbnail),
      order: toInt(row.order_value, 0),
      published: toInt(row.published, 0) === 1,
      hidden: toInt(row.hidden, 0) === 1,
      uploadKind: toText(row.upload_kind, "html") === "zip" ? "zip" : "html",
      createdAt: toText(row.created_at),
      updatedAt: toText(row.updated_at),
      ...(itemType === "upload"
        ? { path: toText(row.path) }
        : { url: toText(row.url) }),
    };
  }

  function queryDynamicItems({ isAdmin = false, q = "", categoryId = "", type = "", offset = 0, limit = 24 } = {}) {
    const where = [];
    const params = [];

    if (!isAdmin) {
      where.push("published = 1");
      where.push("hidden = 0");
    }

    const normalizedCategoryId = toText(categoryId).trim();
    if (normalizedCategoryId) {
      where.push("category_id = ?");
      params.push(normalizedCategoryId);
    }

    const normalizedType = toText(type).trim();
    if (normalizedType) {
      where.push("type = ?");
      params.push(normalizedType);
    }

    const normalizedQ = toText(q).trim().toLowerCase();
    if (normalizedQ) {
      const like = `%${normalizedQ}%`;
      where.push("(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(url) LIKE ? OR LOWER(path) LIKE ? OR LOWER(id) LIKE ?)");
      params.push(like, like, like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

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
    const items = rows.map(mapDynamicItemRow);

    return { total, items };
  }

  function queryDynamicItemsForCatalog({ includeHiddenItems = false, includeUnpublishedItems = false } = {}) {
    const where = [];
    if (!includeUnpublishedItems) where.push("published = 1");
    if (!includeHiddenItems) where.push("hidden = 0");
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const rows = prepareQuery(
        `
          SELECT
            id, type, category_id, title, description, url, path, thumbnail,
            order_value, published, hidden, upload_kind, created_at, updated_at
          FROM state_dynamic_items
          ${whereSql}
        `,
      )
      .all();

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
      )
      .get(...params);

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
      )
      .get(...params);

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
    if (normalizedType && normalizedType !== "builtin") {
      return { total: 0, items: [] };
    }

    const where = [];
    const params = [];

    if (!isAdmin) {
      where.push("published = 1");
      where.push("hidden = 0");
    }

    if (!includeDeleted) {
      where.push("deleted = 0");
    }

    const normalizedCategoryId = toText(categoryId).trim();
    if (normalizedCategoryId) {
      where.push("category_id = ?");
      params.push(normalizedCategoryId);
    }

    const normalizedQ = toText(q).trim().toLowerCase();
    if (normalizedQ) {
      const like = `%${normalizedQ}%`;
      where.push("(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(id) LIKE ?)");
      params.push(like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(1) AS total FROM state_builtin_items ${whereSql}`;
    const totalRow = prepareQuery(countSql).get(...params);
    const total = Math.max(0, toInt(totalRow?.total, 0));

    const safeOffset = Math.max(0, toInt(offset, 0));
    const safeLimit = Math.max(0, toInt(limit, 24));
    if (safeLimit <= 0) {
      return { total, items: [] };
    }

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
      )
      .all(...params, safeLimit, safeOffset);

    return {
      total,
      items: rows.map(mapBuiltinItemRow),
    };
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
    const normalizedCategoryId = toText(categoryId).trim();
    const normalizedQ = toText(q).trim().toLowerCase();
    const safeOffset = Math.max(0, toInt(offset, 0));
    const safeLimit = Math.max(0, toInt(limit, 24));

    const dynamicEnabled = !normalizedType || normalizedType === "link" || normalizedType === "upload";
    const builtinEnabled = !normalizedType || normalizedType === "builtin";
    if (!dynamicEnabled && !builtinEnabled) {
      return { total: 0, items: [] };
    }

    const dynamicWhere = [];
    const dynamicParams = [];
    if (!isAdmin) {
      dynamicWhere.push("published = 1");
      dynamicWhere.push("hidden = 0");
    }
    if (normalizedCategoryId) {
      dynamicWhere.push("category_id = ?");
      dynamicParams.push(normalizedCategoryId);
    }
    if (normalizedType && normalizedType !== "builtin") {
      dynamicWhere.push("type = ?");
      dynamicParams.push(normalizedType);
    }
    if (normalizedQ) {
      const like = `%${normalizedQ}%`;
      dynamicWhere.push("(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(url) LIKE ? OR LOWER(path) LIKE ? OR LOWER(id) LIKE ?)");
      dynamicParams.push(like, like, like, like, like);
    }
    const dynamicWhereSql = dynamicWhere.length ? `WHERE ${dynamicWhere.join(" AND ")}` : "";

    const builtinWhere = [];
    const builtinParams = [];
    if (!isAdmin) {
      builtinWhere.push("published = 1");
      builtinWhere.push("hidden = 0");
    }
    if (!includeDeleted) {
      builtinWhere.push("deleted = 0");
    }
    if (normalizedCategoryId) {
      builtinWhere.push("category_id = ?");
      builtinParams.push(normalizedCategoryId);
    }
    if (normalizedQ) {
      const like = `%${normalizedQ}%`;
      builtinWhere.push("(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(id) LIKE ?)");
      builtinParams.push(like, like, like);
    }
    const builtinWhereSql = builtinWhere.length ? `WHERE ${builtinWhere.join(" AND ")}` : "";

    const dynamicTotal = dynamicEnabled
      ? Math.max(0, toInt(prepareQuery(`SELECT COUNT(1) AS total FROM state_dynamic_items ${dynamicWhereSql}`).get(...dynamicParams)?.total, 0))
      : 0;
    const builtinTotal = builtinEnabled
      ? Math.max(0, toInt(prepareQuery(`SELECT COUNT(1) AS total FROM state_builtin_items ${builtinWhereSql}`).get(...builtinParams)?.total, 0))
      : 0;
    const total = dynamicTotal + builtinTotal;

    if (safeLimit <= 0 || total <= 0 || safeOffset >= total) {
      return { total, items: [] };
    }

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
        ${dynamicWhereSql}
      `);
      selectParams.push(...dynamicParams);
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
        ${builtinWhereSql}
      `);
      selectParams.push(...builtinParams);
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
      )
      .all(...selectParams, safeLimit, safeOffset);

    const items = rows.map((row) => {
      const itemType = toText(row.type);
      if (itemType === "builtin") return mapBuiltinItemRow(row);
      return mapDynamicItemRow(row);
    });

    return { total, items };
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
      )
      .all();

    const byCategory = {};
    for (const row of rows) {
      const categoryId = toText(row?.category_id, "other").trim() || "other";
      byCategory[categoryId] = (byCategory[categoryId] || 0) + Math.max(0, toInt(row?.total, 0));
    }

    return { byCategory };
  }

  return {
    dbPath: filePath,
    readBuffer(key) {
      const row = selectStmt.get(normalizeKey(key));
      if (!row) return null;
      if (Buffer.isBuffer(row.value)) return row.value;
      return Buffer.from(row.value);
    },
    writeBuffer(key, buffer) {
      const value = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || "");
      upsertStmt.run(normalizeKey(key), value, new Date().toISOString());
    },
    deletePath(key) {
      deleteStmt.run(normalizeKey(key));
    },
    syncDynamicItemsFromBuffer,
    syncBuiltinItems,
    clearDynamicItems() {
      clearDynamicStmt.run();
    },
    clearBuiltinItems() {
      clearBuiltinStmt.run();
    },
    getDynamicItemsCount() {
      return toInt(countDynamicStmt.get()?.total, 0);
    },
    getBuiltinItemsCount() {
      return toInt(countBuiltinStmt.get()?.total, 0);
    },
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
  createSqliteMirror,
  normalizeStateDbMode,
};
