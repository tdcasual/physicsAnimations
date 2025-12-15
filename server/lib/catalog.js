const fs = require("fs");
const path = require("path");

const { CATEGORY_TITLES } = require("./categories");
const { loadDynamicState } = require("./storage");

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
        href: `viewer.html?builtin=${encodeURIComponent(file)}`,
        thumbnail,
      };
    });

    categories[categoryId] = { id: categoryId, title, items };
  }

  return { categories };
}

function getOrCreateCategory({ categories, categoryId }) {
  if (categories[categoryId]) return categories[categoryId];
  const title = CATEGORY_TITLES[categoryId] || categoryId;
  categories[categoryId] = { id: categoryId, title, items: [] };
  return categories[categoryId];
}

function loadCatalog({ rootDir }) {
  const builtin = loadBuiltinCatalog({ rootDir });
  const dynamic = loadDynamicState({ rootDir });

  const categories = { ...builtin.categories };

  for (const item of dynamic.items) {
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
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }

  for (const category of Object.values(categories)) {
    category.items.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  }

  return { categories };
}

module.exports = {
  loadCatalog,
};
