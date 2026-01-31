const fs = require("fs");
const path = require("path");

const { DEFAULT_GROUP_ID, GROUP_TITLES, CATEGORY_TITLES } = require("./categories");
const { readAnimationsJson } = require("./animationsIndex");
const { loadItemsState, loadCategoriesState, loadBuiltinItemsState } = require("./state");

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

function loadBuiltinCatalog({
  rootDir,
  builtinState,
  includeHiddenItems = false,
  includeUnpublishedItems = false,
} = {}) {
  const data = readAnimationsJson({ rootDir });
  if (!data) return { categories: {} };
  const overrides = builtinState?.items && typeof builtinState.items === "object" ? builtinState.items : {};
  const categories = {};

  for (const [categoryId, category] of Object.entries(data)) {
    const title = safeText(category?.title || CATEGORY_TITLES[categoryId] || categoryId);
    categories[categoryId] = {
      id: categoryId,
      groupId: DEFAULT_GROUP_ID,
      title,
      order: 0,
      hidden: false,
      items: [],
    };
  }

  for (const [categoryId, category] of Object.entries(data)) {
    for (const item of category?.items || []) {
      const file = safeText(item?.file || "");
      if (!file) continue;
      const thumbnail = safeText(item?.thumbnail || "");
      const itemTitle = safeText(item?.title || file.replace(/\.html$/i, ""));
      const description = safeText(item?.description || "");

      const baseItem = {
        id: file,
        type: "builtin",
        categoryId,
        title: itemTitle,
        description,
        order: 0,
        href: `viewer.html?id=${encodeURIComponent(file)}`,
        src: `animations/${file}`,
        thumbnail,
        published: true,
        hidden: false,
        createdAt: "",
        updatedAt: "",
      };

      const merged = applyBuiltinOverride(baseItem, overrides[file]);
      if (!merged) continue;
      const finalCategoryId = merged.categoryId || categoryId;
      merged.categoryId = finalCategoryId;

      const published = merged.published !== false;
      const hidden = merged.hidden === true;
      if (!includeUnpublishedItems && !published) continue;
      if (!includeHiddenItems && hidden) continue;

      ensureCategory(categories, { id: finalCategoryId, groupId: DEFAULT_GROUP_ID }).items.push(merged);
    }
  }

  return { categories };
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

async function loadCatalog({
  rootDir,
  store,
  includeHiddenCategories = false,
  includeHiddenItems = false,
  includeUnpublishedItems = false,
  includeConfigCategories = false,
} = {}) {
  const builtinState = await loadBuiltinItemsState({ store });
  const builtin = loadBuiltinCatalog({
    rootDir,
    builtinState,
    includeHiddenItems,
    includeUnpublishedItems,
  });
  const dynamic = await loadItemsState({ store });
  const categoryState = await loadCategoriesState({ store });

  const categories = { ...builtin.categories };

  if (includeConfigCategories) {
    for (const [categoryId, config] of Object.entries(categoryState.categories || {})) {
      if (categories[categoryId]) continue;
      const groupId = typeof config?.groupId === "string" && config.groupId.trim() ? config.groupId.trim() : DEFAULT_GROUP_ID;
      categories[categoryId] = {
        id: categoryId,
        groupId,
        title: safeText(config?.title || CATEGORY_TITLES[categoryId] || categoryId),
        order: 0,
        hidden: false,
        items: [],
      };
    }
  }

  for (const item of dynamic.items) {
    const published = item.published !== false;
    const hidden = item.hidden === true;
    if (!includeUnpublishedItems && !published) continue;
    if (!includeHiddenItems && hidden) continue;

    const category = ensureCategory(categories, { id: item.categoryId, groupId: DEFAULT_GROUP_ID });

    const href = `viewer.html?id=${encodeURIComponent(item.id)}`;
    const src =
      item.type === "link" ? safeText(item.url || "") : safeText(item.path || "");

    category.items.push({
      id: item.id,
      type: item.type,
      categoryId: item.categoryId,
      title: safeText(item.title),
      description: safeText(item.description),
      href,
      src,
      thumbnail: safeText(item.thumbnail),
      order: Number.isFinite(item.order) ? Math.trunc(item.order) : 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }

  for (const category of Object.values(categories)) {
    applyCategoryConfig(category, categoryState.categories?.[category.id]);
  }

  const groups = {};
  for (const category of Object.values(categories)) {
    const groupId = safeText(category.groupId || DEFAULT_GROUP_ID) || DEFAULT_GROUP_ID;
    category.groupId = groupId;
    if (!groups[groupId]) {
      groups[groupId] = {
        id: groupId,
        title: getDefaultGroupTitle(groupId),
        order: 0,
        hidden: false,
        categories: {},
      };
    }
    groups[groupId].categories[category.id] = category;
  }

  if (includeConfigCategories) {
    for (const [groupId, config] of Object.entries(categoryState.groups || {})) {
      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          title: getDefaultGroupTitle(groupId),
          order: 0,
          hidden: false,
          categories: {},
        };
      }
      applyGroupConfig(groups[groupId], config);
    }
  }

  for (const group of Object.values(groups)) {
    applyGroupConfig(group, categoryState.groups?.[group.id]);
    for (const category of Object.values(group.categories)) {
      category.items.sort((a, b) => {
        const orderDiff = (b.order || 0) - (a.order || 0);
        if (orderDiff) return orderDiff;
        return a.title.localeCompare(b.title, "zh-CN");
      });
    }
  }

  if (!includeHiddenCategories) {
    for (const [groupId, group] of Object.entries(groups)) {
      if (group.hidden) {
        delete groups[groupId];
        continue;
      }
      for (const [categoryId, category] of Object.entries(group.categories)) {
        if (category.hidden) delete group.categories[categoryId];
      }
    }
  }

  if (!includeHiddenCategories) {
    for (const [groupId, group] of Object.entries(groups)) {
      if (!Object.keys(group.categories).length) delete groups[groupId];
    }
  }

  return { groups };
}

module.exports = {
  loadCatalog,
};
