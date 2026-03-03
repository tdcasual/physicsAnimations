const path = require("path");
const { toInt, toText, toBooleanStrict } = require("../shared/normalizers");

const STATE_BLOB_KEYS = new Set([
  "items.json",
  "categories.json",
  "items_tombstones.json",
  "admin.json",
]);
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function toBool(value, fallback = false) {
  return toBooleanStrict(value, fallback);
}

function normalizeCategoryId(value) {
  const categoryId = toText(value, "other").trim();
  if (!categoryId) return "other";
  if (FORBIDDEN_OBJECT_KEYS.has(categoryId)) return "other";
  return categoryId;
}

function parseTimeMs(value) {
  if (typeof value !== "string") return { valid: false, ms: 0 };
  const normalized = value.trim();
  if (!normalized) return { valid: false, ms: 0 };
  const ms = Date.parse(normalized);
  if (!Number.isFinite(ms)) return { valid: false, ms: 0 };
  return { valid: true, ms };
}

function dynamicRowTimeMs(row) {
  const updated = parseTimeMs(row?.updatedAt);
  if (updated.valid) return updated.ms;
  const created = parseTimeMs(row?.createdAt);
  if (created.valid) return created.ms;
  return 0;
}

function parseDynamicItemsFromBuffer(buffer) {
  if (!buffer) return [];
  let parsed = null;
  try {
    parsed = JSON.parse(Buffer.isBuffer(buffer) ? buffer.toString("utf8") : String(buffer));
  } catch {
    return [];
  }

  const source = Array.isArray(parsed?.items) ? parsed.items : [];
  const rows = [];
  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const id = toText(item.id).trim();
    if (!id) continue;
    const type = item.type === "upload" ? "upload" : item.type === "link" ? "link" : "";
    if (!type) continue;

    rows.push({
      id,
      type,
      categoryId: normalizeCategoryId(item.categoryId),
      title: toText(item.title),
      description: toText(item.description),
      url: type === "link" ? toText(item.url) : "",
      path: type === "upload" ? toText(item.path) : "",
      thumbnail: toText(item.thumbnail),
      order: toInt(item.order, 0),
      published: toBool(item.published, true),
      hidden: toBool(item.hidden, false),
      uploadKind: item.uploadKind === "zip" ? "zip" : "html",
      createdAt: toText(item.createdAt),
      updatedAt: toText(item.updatedAt),
    });
  }

  const deduped = new Map();
  for (const row of rows) {
    const current = deduped.get(row.id);
    if (!current) {
      deduped.set(row.id, row);
      continue;
    }
    if (dynamicRowTimeMs(row) > dynamicRowTimeMs(current)) {
      deduped.set(row.id, row);
    }
  }

  return [...deduped.values()];
}

function normalizeStateDbMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  if (!mode || mode === "off") return "off";
  if (mode === "sqlite") return "sqlite";
  const err = new Error("invalid_state_db_mode");
  err.code = "INVALID_STATE_DB_MODE";
  throw err;
}

function normalizeKey(key) {
  return String(key || "").replace(/^\/+/, "");
}

function isStateBlobKey(key) {
  return STATE_BLOB_KEYS.has(normalizeKey(key));
}

function resolveDbPath({ rootDir, dbPath }) {
  if (typeof dbPath === "string" && dbPath.trim()) {
    if (path.isAbsolute(dbPath)) return dbPath;
    return path.join(rootDir || process.cwd(), dbPath);
  }
  return path.join(rootDir || process.cwd(), "content", "state.sqlite");
}

module.exports = {
  STATE_BLOB_KEYS,
  toInt,
  toBool,
  toText,
  parseDynamicItemsFromBuffer,
  normalizeStateDbMode,
  normalizeKey,
  isStateBlobKey,
  resolveDbPath,
};
