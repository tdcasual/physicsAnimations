const { DEFAULT_GROUP_ID, GROUP_TITLES, CATEGORY_TITLES } = require("./categories");
const { loadCatalog } = require("./catalog");
const { loadCategoriesState } = require("./state");

const EMPTY_ITEMS_STATE_BUFFER = Buffer.from('{"version":2,"items":[]}\n', "utf8");
const FORBIDDEN_MAP_KEYS = new Set(["__proto__", "prototype", "constructor"]);

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

function normalizeCategoryId(categoryId) {
  const id = safeText(categoryId).trim();
  if (!id) return "other";
  if (FORBIDDEN_MAP_KEYS.has(id)) return "other";
  return id;
}

function normalizeGroupId(groupId) {
  const id = safeText(groupId).trim();
  if (!id) return DEFAULT_GROUP_ID;
  if (FORBIDDEN_MAP_KEYS.has(id)) return DEFAULT_GROUP_ID;
  return id;
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

function normalizeDynamicCountMap(rawMap) {
  if (!rawMap || typeof rawMap !== "object") return Object.create(null);
  const out = Object.create(null);
  for (const [categoryId, value] of Object.entries(rawMap)) {
    if (typeof categoryId !== "string" || !categoryId) continue;
    const normalizedCategoryId = normalizeCategoryId(categoryId);
    out[normalizedCategoryId] =
      Math.max(0, toInt(out[normalizedCategoryId], 0)) + Math.max(0, toInt(value, 0));
  }
  return out;
}

function getCategoryDynamicCount(category, dynamicCountMap) {
  if (dynamicCountMap) {
    return Math.max(0, toInt(dynamicCountMap[category.id], 0));
  }
  return (category.items || []).length;
}

function buildCategoriesPayload(catalog, { dynamicCountMap = null } = {}) {
  const groups = Object.values(catalog.groups || {}).map((group) => {
    const categories = Object.values(group.categories || {});
    const builtinCount = 0;
    const dynamicCount = categories.reduce(
      (sum, category) => sum + getCategoryDynamicCount(category, dynamicCountMap),
      0,
    );
    const count = dynamicCount;

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
      const builtinCount = 0;
      const dynamicCount = getCategoryDynamicCount(category, dynamicCountMap);
      return {
        id: category.id,
        groupId: category.groupId || DEFAULT_GROUP_ID,
        title: category.title,
        order: category.order || 0,
        hidden: Boolean(category.hidden),
        count: dynamicCount,
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

async function buildCategoriesPayloadWithSql({ rootDir, store, isAdmin, taxonomyQueryRepo } = {}) {
  const queryDynamicCategoryCounts =
    (typeof taxonomyQueryRepo?.queryDynamicCategoryCounts === "function"
      ? taxonomyQueryRepo.queryDynamicCategoryCounts.bind(taxonomyQueryRepo)
      : null) ||
    (typeof store?.stateDbQuery?.queryDynamicCategoryCounts === "function"
      ? store.stateDbQuery.queryDynamicCategoryCounts.bind(store.stateDbQuery)
      : null);

  if (!queryDynamicCategoryCounts) {
    throw new TypeError("buildCategoriesPayloadWithSql requires queryDynamicCategoryCounts");
  }

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
    queryDynamicCategoryCounts({ isAdmin }),
  ]);

  const dynamicCountMap = normalizeDynamicCountMap(dynamicResult?.byCategory);

  const groups = Object.create(null);
  for (const [groupId, group] of Object.entries(baseCatalog.groups || {})) {
    const normalizedGroupId = normalizeGroupId(groupId);
    groups[normalizedGroupId] = {
      ...group,
      id: normalizedGroupId,
      categories: Object.assign(Object.create(null), group.categories || {}),
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

    const normalizedCategoryId = normalizeCategoryId(categoryId);
    const category = {
      id: normalizedCategoryId,
      groupId: DEFAULT_GROUP_ID,
      title: getDefaultCategoryTitle(normalizedCategoryId),
      order: 0,
      hidden: false,
      items: [],
    };
    applyCategoryConfig(category, categoryState.categories?.[categoryId]);

    const groupId = normalizeGroupId(category.groupId || DEFAULT_GROUP_ID);
    category.groupId = groupId;

    if (!groups[groupId]) {
      const group = {
        id: groupId,
        title: getDefaultGroupTitle(groupId),
        order: 0,
        hidden: false,
        categories: Object.create(null),
      };
      applyGroupConfig(group, categoryState.groups?.[groupId]);
      groups[groupId] = group;
    }

    const group = groups[groupId];
    if (!isAdmin && (category.hidden || group.hidden)) {
      continue;
    }

    group.categories[category.id] = category;
    categoryMap.set(category.id, category);
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
