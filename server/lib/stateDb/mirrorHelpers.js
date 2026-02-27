const fs = require("fs");
const path = require("path");

const STATE_BLOB_KEYS = new Set([
  "items.json",
  "categories.json",
  "builtin_items.json",
  "items_tombstones.json",
  "admin.json",
]);

const BUILTIN_ITEMS_STATE_KEY = "builtin_items.json";

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function toText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
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
      categoryId: toText(item.categoryId, "other") || "other",
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
  return rows;
}

function parseBuiltinOverridesFromBuffer(buffer) {
  if (!buffer) return {};
  let parsed = null;
  try {
    parsed = JSON.parse(Buffer.isBuffer(buffer) ? buffer.toString("utf8") : String(buffer));
  } catch {
    return {};
  }

  const source = parsed?.items && typeof parsed.items === "object" ? parsed.items : {};
  const overrides = {};

  for (const [id, value] of Object.entries(source)) {
    if (typeof id !== "string" || !id) continue;
    if (!value || typeof value !== "object") continue;

    const out = {};
    if (typeof value.title === "string" && value.title.trim()) out.title = value.title.trim();
    if (typeof value.description === "string") out.description = value.description;
    if (typeof value.categoryId === "string" && value.categoryId.trim()) out.categoryId = value.categoryId.trim();
    if (Number.isFinite(value.order)) out.order = Math.trunc(value.order);
    if (typeof value.published === "boolean") out.published = value.published;
    if (typeof value.hidden === "boolean") out.hidden = value.hidden;
    if (typeof value.updatedAt === "string") out.updatedAt = value.updatedAt;
    if (value.deleted === true) out.deleted = true;

    overrides[id] = out;
  }

  return overrides;
}

function loadBuiltinBaseRows({ rootDir }) {
  const filePath = path.join(rootDir || process.cwd(), "animations.json");
  let parsed = null;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }

  const rows = [];
  for (const [categoryId, category] of Object.entries(parsed || {})) {
    for (const item of category?.items || []) {
      const id = toText(item?.file).trim();
      if (!id) continue;

      rows.push({
        id,
        categoryId: toText(categoryId, "other") || "other",
        title: toText(item?.title, id.replace(/\.html$/i, "")),
        description: toText(item?.description),
        thumbnail: toText(item?.thumbnail),
        order: 0,
        published: true,
        hidden: false,
        deleted: false,
        updatedAt: "",
      });
    }
  }

  return rows;
}

function getAnimationsSignature({ rootDir }) {
  const filePath = path.join(rootDir || process.cwd(), "animations.json");
  try {
    const stat = fs.statSync(filePath);
    return `${stat.mtimeMs}:${stat.size}`;
  } catch {
    return "missing";
  }
}

function normalizeStateDbMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  if (!mode || mode === "off" || mode === "disabled" || mode === "false") return "off";
  if (mode === "sqlite") return "sqlite";
  return "off";
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
  BUILTIN_ITEMS_STATE_KEY,
  toInt,
  toBool,
  toText,
  parseDynamicItemsFromBuffer,
  parseBuiltinOverridesFromBuffer,
  loadBuiltinBaseRows,
  getAnimationsSignature,
  normalizeStateDbMode,
  normalizeKey,
  isStateBlobKey,
  resolveDbPath,
};
