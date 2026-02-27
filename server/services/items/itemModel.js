function safeText(text) {
  if (typeof text !== "string") return "";
  return text;
}

function normalizeCategoryId(categoryId) {
  if (typeof categoryId !== "string") return "other";
  const trimmed = categoryId.trim();
  return trimmed || "other";
}

function toApiItem(item) {
  if (item.type === "builtin") {
    return {
      id: item.id,
      type: "builtin",
      categoryId: item.categoryId,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      order: item.order || 0,
      published: item.published !== false,
      hidden: item.hidden === true,
      deleted: item.deleted === true,
      src: `animations/${item.id}`,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  const src = item.type === "link" ? item.url : item.path;
  return {
    id: item.id,
    type: item.type,
    categoryId: item.categoryId,
    title: item.title,
    description: item.description,
    thumbnail: item.thumbnail,
    order: item.order || 0,
    published: item.published !== false,
    hidden: item.hidden === true,
    deleted: false,
    src,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

module.exports = {
  safeText,
  normalizeCategoryId,
  toApiItem,
};
