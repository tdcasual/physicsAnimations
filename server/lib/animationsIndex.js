const fs = require("fs");
const path = require("path");

const cache = new Map();

function safeText(text) {
  if (typeof text !== "string") return "";
  return text;
}

function buildFlatIndex(data) {
  const items = [];
  const byId = new Map();

  for (const [categoryId, category] of Object.entries(data || {})) {
    for (const raw of category?.items || []) {
      const file = safeText(raw?.file || "");
      if (!file) continue;

      const item = {
        id: file,
        categoryId,
        title: safeText(raw?.title || file.replace(/\.html$/i, "")),
        description: safeText(raw?.description || ""),
        thumbnail: safeText(raw?.thumbnail || ""),
      };
      items.push(item);
      byId.set(file, item);
    }
  }

  return { items, byId };
}

function getEntry(rootDir) {
  const filePath = path.join(rootDir, "animations.json");

  let stat = null;
  try {
    stat = fs.statSync(filePath);
  } catch {
    cache.delete(filePath);
    return null;
  }

  const key = filePath;
  const cached = cache.get(key);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached;

  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  const flat = buildFlatIndex(data);

  const entry = {
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    data,
    flatItems: flat.items,
    flatById: flat.byId,
  };
  cache.set(key, entry);
  return entry;
}

function readAnimationsJson({ rootDir }) {
  const entry = getEntry(rootDir);
  return entry?.data || null;
}

function listBuiltinItems({ rootDir }) {
  const entry = getEntry(rootDir);
  return entry?.flatItems ? [...entry.flatItems] : [];
}

function findBuiltinItem({ rootDir, id }) {
  const entry = getEntry(rootDir);
  if (!entry?.flatById) return null;
  return entry.flatById.get(id) || null;
}

module.exports = {
  readAnimationsJson,
  listBuiltinItems,
  findBuiltinItem,
};

