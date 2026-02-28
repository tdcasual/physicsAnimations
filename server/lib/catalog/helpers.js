const { DEFAULT_GROUP_ID, GROUP_TITLES, CATEGORY_TITLES } = require("../categories");

function safeText(text) {
  if (typeof text !== "string") return "";
  return text;
}

function applyBuiltinOverride(item, override) {
  const out = { ...item };
  if (!override || typeof override !== "object") return out;
  if (override.deleted === true) return null;

  if (typeof override.title === "string") {
    const title = override.title.trim();
    if (title) out.title = safeText(title);
  }
  if (typeof override.description === "string") {
    out.description = safeText(override.description);
  }
  if (typeof override.categoryId === "string") {
    const categoryId = override.categoryId.trim();
    if (categoryId) out.categoryId = safeText(categoryId);
  }
  if (Number.isFinite(override.order)) out.order = Math.trunc(override.order);
  if (typeof override.published === "boolean") out.published = override.published;
  if (typeof override.hidden === "boolean") out.hidden = override.hidden;
  if (typeof override.updatedAt === "string") out.updatedAt = override.updatedAt;

  return out;
}

function getDefaultCategoryTitle(categoryId) {
  return safeText(CATEGORY_TITLES[categoryId] || categoryId);
}

function getDefaultGroupTitle(groupId) {
  return safeText(GROUP_TITLES[groupId] || groupId);
}

function ensureCategory(categories, { id, groupId }) {
  if (categories[id]) return categories[id];
  categories[id] = {
    id,
    groupId: groupId || DEFAULT_GROUP_ID,
    title: getDefaultCategoryTitle(id),
    order: 0,
    hidden: false,
    items: [],
  };
  return categories[id];
}

function applyCategoryConfig(category, config) {
  if (!config || typeof config !== "object") return;
  const maybeTitle = typeof config.title === "string" ? config.title.trim() : "";
  if (maybeTitle) category.title = safeText(maybeTitle);
  if (Number.isFinite(config.order)) category.order = Math.trunc(config.order);
  if (typeof config.hidden === "boolean") category.hidden = config.hidden;
  if (typeof config.groupId === "string" && config.groupId.trim()) category.groupId = config.groupId.trim();
}

function applyGroupConfig(group, config) {
  if (!config || typeof config !== "object") return;
  const maybeTitle = typeof config.title === "string" ? config.title.trim() : "";
  if (maybeTitle) group.title = safeText(maybeTitle);
  if (Number.isFinite(config.order)) group.order = Math.trunc(config.order);
  if (typeof config.hidden === "boolean") group.hidden = config.hidden;
}

module.exports = {
  safeText,
  applyBuiltinOverride,
  getDefaultCategoryTitle,
  getDefaultGroupTitle,
  ensureCategory,
  applyCategoryConfig,
  applyGroupConfig,
  DEFAULT_GROUP_ID,
  CATEGORY_TITLES,
};
