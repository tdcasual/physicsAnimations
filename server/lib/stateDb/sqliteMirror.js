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
const { withImmediateTransaction } = require("./sqliteMirror/circuitGuard");
const { createQueryRunner } = require("./sqliteMirror/queryRunner");

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
    withImmediateTransaction(db, () => {
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
    });
  }

  function syncBuiltinItems({ rootDir, builtinOverridesBuffer }) {
    const baseRows = loadBuiltinBaseRows({ rootDir });
    const overrides = parseBuiltinOverridesFromBuffer(builtinOverridesBuffer);

    withImmediateTransaction(db, () => {
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
    });
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

  const queryRunner = createQueryRunner({
    prepareQuery,
    mapDynamicItemRow,
    mapBuiltinItemRow,
  });

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
    queryDynamicItems: queryRunner.queryDynamicItems,
    queryDynamicItemsForCatalog: queryRunner.queryDynamicItemsForCatalog,
    queryDynamicItemById: queryRunner.queryDynamicItemById,
    queryBuiltinItemById: queryRunner.queryBuiltinItemById,
    queryBuiltinItems: queryRunner.queryBuiltinItems,
    queryItems: queryRunner.queryItems,
    queryDynamicCategoryCounts: queryRunner.queryDynamicCategoryCounts,
  };
}

module.exports = {
  createSqliteMirror,
  normalizeStateDbMode,
};
