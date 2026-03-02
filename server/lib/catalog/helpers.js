const { DEFAULT_GROUP_ID, GROUP_TITLES, CATEGORY_TITLES } = require("../categories");
const { hasOwnProperty } = Object.prototype;

const FORBIDDEN_MAP_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function safeText(text) {
  if (typeof text !== "string") return "";
  return text;
}

function isForbiddenMapKey(value) {
  return FORBIDDEN_MAP_KEYS.has(String(value || ""));
}

function normalizeCategoryId(categoryId) {
  if (typeof categoryId !== "string") return "other";
  const trimmed = categoryId.trim();
  if (!trimmed) return "other";
  if (isForbiddenMapKey(trimmed)) return "other";
  return trimmed;
}

function normalizeGroupId(groupId) {
  if (typeof groupId !== "string") return DEFAULT_GROUP_ID;
  const trimmed = groupId.trim();
  if (!trimmed) return DEFAULT_GROUP_ID;
  if (isForbiddenMapKey(trimmed)) return DEFAULT_GROUP_ID;
  return trimmed;
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
    out.categoryId = normalizeCategoryId(override.categoryId);
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
  const categoryId = normalizeCategoryId(id);
  if (hasOwnProperty.call(categories, categoryId)) return categories[categoryId];
  categories[categoryId] = {
    id: categoryId,
    groupId: normalizeGroupId(groupId),
    title: getDefaultCategoryTitle(categoryId),
    order: 0,
    hidden: false,
    items: [],
  };
  return categories[categoryId];
}

function applyCategoryConfig(category, config) {
  if (!config || typeof config !== "object") return;
  const maybeTitle = typeof config.title === "string" ? config.title.trim() : "";
  if (maybeTitle) category.title = safeText(maybeTitle);
  if (Number.isFinite(config.order)) category.order = Math.trunc(config.order);
  if (typeof config.hidden === "boolean") category.hidden = config.hidden;
  if (typeof config.groupId === "string" && config.groupId.trim()) category.groupId = normalizeGroupId(config.groupId);
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
  normalizeCategoryId,
  normalizeGroupId,
  getDefaultCategoryTitle,
  getDefaultGroupTitle,
  ensureCategory,
  applyCategoryConfig,
  applyGroupConfig,
  DEFAULT_GROUP_ID,
  CATEGORY_TITLES,
};
