const { readAnimationsJson } = require("../animationsIndex");

const { applyBuiltinOverride, CATEGORY_TITLES, DEFAULT_GROUP_ID, ensureCategory, safeText } = require("./helpers");

function loadBuiltinCatalog({
  rootDir,
  builtinState,
  includeHiddenItems = false,
  includeUnpublishedItems = false,
} = {}) {
  const data = readAnimationsJson({ rootDir });
  if (!data) return { categories: Object.create(null) };
  const overrides = builtinState?.items && typeof builtinState.items === "object" ? builtinState.items : {};
  const categories = Object.create(null);

  for (const [categoryId, category] of Object.entries(data)) {
    const categoryEntry = ensureCategory(categories, { id: categoryId, groupId: DEFAULT_GROUP_ID });
    categoryEntry.title = safeText(category?.title || CATEGORY_TITLES[categoryEntry.id] || categoryEntry.id);
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
        href: `/viewer/${encodeURIComponent(file)}`,
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

      const published = merged.published !== false;
      const hidden = merged.hidden === true;
      if (!includeUnpublishedItems && !published) continue;
      if (!includeHiddenItems && hidden) continue;

      const categoryEntry = ensureCategory(categories, { id: finalCategoryId, groupId: DEFAULT_GROUP_ID });
      merged.categoryId = categoryEntry.id;
      categoryEntry.items.push(merged);
    }
  }

  return { categories };
}

module.exports = {
  loadBuiltinCatalog,
};
