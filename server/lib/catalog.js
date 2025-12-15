const fs = require("fs");
const path = require("path");

const { CATEGORY_TITLES } = require("./categories");
const { loadItemsState, loadCategoriesState } = require("./state");

function safeText(text) {
  if (typeof text !== "string") return "";
  return text;
}

function loadBuiltinCatalog({ rootDir }) {
  const filePath = path.join(rootDir, "animations.json");
  if (!fs.existsSync(filePath)) return { categories: {} };

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const categories = {};

  for (const [categoryId, category] of Object.entries(data)) {
    const title = safeText(category?.title || CATEGORY_TITLES[categoryId] || categoryId);
    const items = (category?.items || []).map((item) => {
      const file = safeText(item?.file || "");
      const thumbnail = safeText(item?.thumbnail || "");
      const itemTitle = safeText(item?.title || file.replace(/\.html$/i, ""));
      const description = safeText(item?.description || "");

      return {
        id: file,
        type: "builtin",
        categoryId,
        title: itemTitle,
        description,
        order: 0,
        href: `viewer.html?builtin=${encodeURIComponent(file)}`,
        thumbnail,
      };
    });

    categories[categoryId] = { id: categoryId, title, order: 0, hidden: false, items };
  }

  return { categories };
}

function getOrCreateCategory({ categories, categoryId }) {
  if (categories[categoryId]) return categories[categoryId];
  const title = CATEGORY_TITLES[categoryId] || categoryId;
  categories[categoryId] = { id: categoryId, title, order: 0, hidden: false, items: [] };
  return categories[categoryId];
}

async function loadCatalog({
  rootDir,
  store,
  includeHiddenCategories = false,
  includeHiddenItems = false,
  includeUnpublishedItems = false,
  includeConfigCategories = false,
} = {}) {
  const builtin = loadBuiltinCatalog({ rootDir });
  const dynamic = await loadItemsState({ store });
  const categoryState = await loadCategoriesState({ store });

  const categories = { ...builtin.categories };

  if (includeConfigCategories) {
    for (const [categoryId, config] of Object.entries(categoryState.categories || {})) {
      if (categories[categoryId]) continue;
      categories[categoryId] = {
        id: categoryId,
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

    const category = getOrCreateCategory({ categories, categoryId: item.categoryId });

    const href = `viewer.html?id=${encodeURIComponent(item.id)}`;

    category.items.push({
      id: item.id,
      type: item.type,
      categoryId: item.categoryId,
      title: safeText(item.title),
      description: safeText(item.description),
      href,
      thumbnail: safeText(item.thumbnail),
      order: Number.isFinite(item.order) ? Math.trunc(item.order) : 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }

  for (const category of Object.values(categories)) {
    const config = categoryState.categories?.[category.id];
    if (config) {
      const maybeTitle = typeof config.title === "string" ? config.title.trim() : "";
      if (maybeTitle) category.title = safeText(maybeTitle);
      if (Number.isFinite(config.order)) category.order = Math.trunc(config.order);
      if (typeof config.hidden === "boolean") category.hidden = config.hidden;
    }
  }

  if (!includeHiddenCategories) {
    for (const [categoryId, category] of Object.entries(categories)) {
      if (category.hidden) delete categories[categoryId];
    }
  }

  for (const category of Object.values(categories)) {
    category.items.sort((a, b) => {
      const orderDiff = (b.order || 0) - (a.order || 0);
      if (orderDiff) return orderDiff;
      return a.title.localeCompare(b.title, "zh-CN");
    });
  }

  return { categories };
}

module.exports = {
  loadCatalog,
};
