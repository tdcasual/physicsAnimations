const { DEFAULT_GROUP_ID, GROUP_TITLES, CATEGORY_TITLES } = require("./categories");
const { loadCatalog } = require("./catalog");
const { loadCategoriesState } = require("./state");

const EMPTY_ITEMS_STATE_BUFFER = Buffer.from('{"version":2,"items":[]}\n', "utf8");

function safeText(text) {
  if (typeof text !== "string") return "";
  return text;
}

function toInt(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.trunc(num);
}

function getDefaultCategoryTitle(categoryId) {
  return safeText(CATEGORY_TITLES[categoryId] || categoryId);
}

function getDefaultGroupTitle(groupId) {
  return safeText(GROUP_TITLES[groupId] || groupId);
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

function normalizeDynamicCountMap(rawMap) {
  if (!rawMap || typeof rawMap !== "object") return {};
  const out = {};
  for (const [categoryId, value] of Object.entries(rawMap)) {
    if (typeof categoryId !== "string" || !categoryId) continue;
    out[categoryId] = Math.max(0, toInt(value, 0));
  }
  return out;
}

function getCategoryBuiltinCount(category) {
  return (category.items || []).filter((item) => item.type === "builtin").length;
}

function getCategoryDynamicCount(category, dynamicCountMap) {
  if (dynamicCountMap) {
    return Math.max(0, toInt(dynamicCountMap[category.id], 0));
  }
  return (category.items || []).filter((item) => item.type !== "builtin").length;
}

function buildCategoriesPayload(catalog, { dynamicCountMap = null } = {}) {
  const groups = Object.values(catalog.groups || {}).map((group) => {
    const categories = Object.values(group.categories || {});
    const builtinCount = categories.reduce((sum, category) => sum + getCategoryBuiltinCount(category), 0);
    const dynamicCount = categories.reduce(
      (sum, category) => sum + getCategoryDynamicCount(category, dynamicCountMap),
      0,
    );
    const count = builtinCount + dynamicCount;

    return {
      id: group.id,
      title: group.title,
      order: group.order || 0,
      hidden: Boolean(group.hidden),
      categoryCount: categories.length,
      count,
      builtinCount,
      dynamicCount,
    };
  });

  groups.sort((a, b) => {
    const orderDiff = (b.order || 0) - (a.order || 0);
    if (orderDiff) return orderDiff;
    return a.title.localeCompare(b.title, "zh-CN");
  });

  const categories = Object.values(catalog.groups || {}).flatMap((group) =>
    Object.values(group.categories || {}).map((category) => {
      const builtinCount = getCategoryBuiltinCount(category);
      const dynamicCount = getCategoryDynamicCount(category, dynamicCountMap);
      return {
        id: category.id,
        groupId: category.groupId || DEFAULT_GROUP_ID,
        title: category.title,
        order: category.order || 0,
        hidden: Boolean(category.hidden),
        count: builtinCount + dynamicCount,
        builtinCount,
        dynamicCount,
      };
    }),
  );

  categories.sort((a, b) => {
    const groupDiff = a.groupId.localeCompare(b.groupId, "zh-CN");
    if (groupDiff) return groupDiff;
    const orderDiff = (b.order || 0) - (a.order || 0);
    if (orderDiff) return orderDiff;
    return a.title.localeCompare(b.title, "zh-CN");
  });

  return { groups, categories };
}

function createCatalogStoreWithoutDynamicItems(store) {
  return {
    async readBuffer(key) {
      const normalizedKey = String(key || "").replace(/^\/+/, "");
      if (normalizedKey === "items.json") return EMPTY_ITEMS_STATE_BUFFER;
      return store.readBuffer(normalizedKey);
    },
  };
}

async function buildCategoriesPayloadWithSql({ rootDir, store, isAdmin, taxonomyQueryRepo }) {
  const repo =
    taxonomyQueryRepo ||
    {
      queryDynamicCategoryCounts: (options) => store.stateDbQuery.queryDynamicCategoryCounts(options),
    };
  const [baseCatalog, categoryState, dynamicResult] = await Promise.all([
    loadCatalog({
      rootDir,
      store: createCatalogStoreWithoutDynamicItems(store),
      includeHiddenCategories: isAdmin,
      includeHiddenItems: isAdmin,
      includeUnpublishedItems: isAdmin,
      includeConfigCategories: isAdmin,
    }),
    loadCategoriesState({ store }),
    repo.queryDynamicCategoryCounts({ isAdmin }),
  ]);

  const dynamicCountMap = normalizeDynamicCountMap(dynamicResult?.byCategory);

  const groups = {};
  for (const [groupId, group] of Object.entries(baseCatalog.groups || {})) {
    groups[groupId] = {
      ...group,
      categories: { ...(group.categories || {}) },
    };
  }

  const categoryMap = new Map();
  for (const group of Object.values(groups)) {
    for (const category of Object.values(group.categories || {})) {
      categoryMap.set(category.id, category);
    }
  }

  for (const [categoryId, dynamicCount] of Object.entries(dynamicCountMap)) {
    if (dynamicCount <= 0) continue;
    if (categoryMap.has(categoryId)) continue;

    const category = {
      id: categoryId,
      groupId: DEFAULT_GROUP_ID,
      title: getDefaultCategoryTitle(categoryId),
      order: 0,
      hidden: false,
      items: [],
    };
    applyCategoryConfig(category, categoryState.categories?.[categoryId]);

    const groupId = safeText(category.groupId || DEFAULT_GROUP_ID) || DEFAULT_GROUP_ID;
    category.groupId = groupId;

    if (!groups[groupId]) {
      const group = {
        id: groupId,
        title: getDefaultGroupTitle(groupId),
        order: 0,
        hidden: false,
        categories: {},
      };
      applyGroupConfig(group, categoryState.groups?.[groupId]);
      groups[groupId] = group;
    }

    const group = groups[groupId];
    if (!isAdmin && (category.hidden || group.hidden)) {
      continue;
    }

    group.categories[categoryId] = category;
    categoryMap.set(categoryId, category);
  }

  if (!isAdmin) {
    for (const [groupId, group] of Object.entries(groups)) {
      if (group.hidden) {
        delete groups[groupId];
        continue;
      }
      for (const [categoryId, category] of Object.entries(group.categories || {})) {
        if (category.hidden) delete group.categories[categoryId];
      }
    }

    for (const [groupId, group] of Object.entries(groups)) {
      if (!Object.keys(group.categories || {}).length) {
        delete groups[groupId];
      }
    }
  }

  return buildCategoriesPayload({ groups }, { dynamicCountMap });
}

module.exports = {
  buildCategoriesPayload,
  buildCategoriesPayloadWithSql,
};
