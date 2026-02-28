const { loadCategoriesState, loadBuiltinItemsState } = require("./state");
const { loadBuiltinCatalog } = require("./catalog/builtinLoader");
const { loadDynamicCatalogItems } = require("./catalog/dynamicLoader");
const {
  DEFAULT_GROUP_ID,
  CATEGORY_TITLES,
  applyCategoryConfig,
  applyGroupConfig,
  ensureCategory,
  getDefaultGroupTitle,
  safeText,
} = require("./catalog/helpers");

async function loadCatalog({
  rootDir,
  store,
  taxonomyQueryRepo,
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
  const dynamic = await loadDynamicCatalogItems({
    store,
    taxonomyQueryRepo,
    includeHiddenItems,
    includeUnpublishedItems,
  });
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

    const href = `/viewer/${encodeURIComponent(item.id)}`;
    const src = item.type === "link" ? safeText(item.url || "") : safeText(item.path || "");

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
