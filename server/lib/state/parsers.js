const { DEFAULT_GROUP_ID, TAXONOMY_VERSION } = require("./constants");

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function emptyItemsState() {
  return { version: 2, items: [] };
}

function parseItemsState(parsed) {
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
    return emptyItemsState();
  }

  const items = [];
  for (const item of parsed.items) {
    if (!item || typeof item !== "object") continue;
    if (typeof item.id !== "string" || !item.id) continue;

    const type = item.type === "upload" ? "upload" : item.type === "link" ? "link" : "link";
    const base = {
      id: item.id,
      type,
      categoryId: typeof item.categoryId === "string" ? item.categoryId : "other",
      title: typeof item.title === "string" ? item.title : "",
      description: typeof item.description === "string" ? item.description : "",
      thumbnail: typeof item.thumbnail === "string" ? item.thumbnail : "",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
      order: toInt(item.order, 0),
      published: typeof item.published === "boolean" ? item.published : true,
      hidden: typeof item.hidden === "boolean" ? item.hidden : false,
      uploadKind: item.uploadKind === "zip" ? "zip" : item.uploadKind === "html" ? "html" : "html",
    };

    if (type === "upload") {
      items.push({
        ...base,
        path: typeof item.path === "string" ? item.path : "",
      });
      continue;
    }

    items.push({
      ...base,
      url: typeof item.url === "string" ? item.url : "",
    });
  }

  return { version: 2, items };
}

function emptyCategoriesState() {
  return { version: TAXONOMY_VERSION, groups: {}, categories: {} };
}

function parseCategoriesState(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return emptyCategoriesState();
  }

  const version = Number(parsed.version || 0);
  const rawGroups = parsed.groups && typeof parsed.groups === "object" ? parsed.groups : {};
  const rawCategories = parsed.categories && typeof parsed.categories === "object" ? parsed.categories : {};

  const groups = {};
  const categories = {};

  if (version < TAXONOMY_VERSION) {
    return { version: TAXONOMY_VERSION, groups, categories };
  }

  for (const [id, group] of Object.entries(rawGroups)) {
    if (typeof id !== "string" || !id) continue;
    if (!group || typeof group !== "object") continue;

    const title = typeof group.title === "string" ? group.title : "";
    const order = toInt(group.order, 0);
    const hidden = typeof group.hidden === "boolean" ? group.hidden : false;
    groups[id] = { id, title, order, hidden };
  }

  for (const [id, category] of Object.entries(rawCategories)) {
    if (typeof id !== "string" || !id) continue;
    if (!category || typeof category !== "object") continue;

    const title = typeof category.title === "string" ? category.title : "";
    const order = toInt(category.order, 0);
    const hidden = typeof category.hidden === "boolean" ? category.hidden : false;
    const groupId = typeof category.groupId === "string" && category.groupId ? category.groupId : DEFAULT_GROUP_ID;
    categories[id] = { id, groupId, title, order, hidden };
  }

  return { version: TAXONOMY_VERSION, groups, categories };
}

function emptyBuiltinItemsState() {
  return { version: 1, items: {} };
}

function parseBuiltinItemsState(parsed) {
  if (!parsed || typeof parsed !== "object" || !parsed.items || typeof parsed.items !== "object") {
    return emptyBuiltinItemsState();
  }

  const items = {};
  for (const [id, value] of Object.entries(parsed.items)) {
    if (typeof id !== "string" || !id) continue;
    if (!value || typeof value !== "object") continue;

    const entry = {};
    if (typeof value.title === "string") entry.title = value.title;
    if (typeof value.description === "string") entry.description = value.description;
    if (typeof value.categoryId === "string") entry.categoryId = value.categoryId;
    if (Number.isFinite(value.order)) entry.order = toInt(value.order, 0);
    if (typeof value.published === "boolean") entry.published = value.published;
    if (typeof value.hidden === "boolean") entry.hidden = value.hidden;
    if (typeof value.deleted === "boolean") entry.deleted = value.deleted;
    if (typeof value.updatedAt === "string") entry.updatedAt = value.updatedAt;

    items[id] = entry;
  }

  return { version: 1, items };
}

function emptyItemTombstonesState() {
  return { version: 1, tombstones: {} };
}

function parseItemTombstonesState(parsed) {
  if (!parsed || typeof parsed !== "object" || !parsed.tombstones || typeof parsed.tombstones !== "object") {
    return emptyItemTombstonesState();
  }

  const tombstones = {};
  for (const [id, value] of Object.entries(parsed.tombstones)) {
    if (typeof id !== "string" || !id) continue;
    if (!value || typeof value !== "object") continue;
    if (typeof value.deletedAt !== "string" || !value.deletedAt) continue;
    tombstones[id] = { deletedAt: value.deletedAt };
  }

  return { version: 1, tombstones };
}

module.exports = {
  emptyItemsState,
  parseItemsState,
  emptyCategoriesState,
  parseCategoriesState,
  emptyBuiltinItemsState,
  parseBuiltinItemsState,
  emptyItemTombstonesState,
  parseItemTombstonesState,
};
