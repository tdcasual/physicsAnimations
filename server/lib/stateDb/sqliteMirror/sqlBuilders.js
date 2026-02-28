const { toText } = require("../mirrorHelpers");

function buildDynamicWhereClause({ isAdmin = false, q = "", categoryId = "", type = "" } = {}) {
  const where = [];
  const params = [];

  if (!isAdmin) {
    where.push("published = 1");
    where.push("hidden = 0");
  }

  const normalizedCategoryId = toText(categoryId).trim();
  if (normalizedCategoryId) {
    where.push("category_id = ?");
    params.push(normalizedCategoryId);
  }

  const normalizedType = toText(type).trim();
  if (normalizedType) {
    where.push("type = ?");
    params.push(normalizedType);
  }

  const normalizedQ = toText(q).trim().toLowerCase();
  if (normalizedQ) {
    const like = `%${normalizedQ}%`;
    where.push("(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(url) LIKE ? OR LOWER(path) LIKE ? OR LOWER(id) LIKE ?)");
    params.push(like, like, like, like, like);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
    normalizedType,
  };
}

function buildBuiltinWhereClause({ isAdmin = false, includeDeleted = false, q = "", categoryId = "" } = {}) {
  const where = [];
  const params = [];

  if (!isAdmin) {
    where.push("published = 1");
    where.push("hidden = 0");
  }

  if (!includeDeleted) {
    where.push("deleted = 0");
  }

  const normalizedCategoryId = toText(categoryId).trim();
  if (normalizedCategoryId) {
    where.push("category_id = ?");
    params.push(normalizedCategoryId);
  }

  const normalizedQ = toText(q).trim().toLowerCase();
  if (normalizedQ) {
    const like = `%${normalizedQ}%`;
    where.push("(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(id) LIKE ?)");
    params.push(like, like, like);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

function buildDynamicCatalogWhereClause({ includeHiddenItems = false, includeUnpublishedItems = false } = {}) {
  const where = [];
  if (!includeUnpublishedItems) where.push("published = 1");
  if (!includeHiddenItems) where.push("hidden = 0");
  return where.length ? `WHERE ${where.join(" AND ")}` : "";
}

module.exports = {
  buildDynamicWhereClause,
  buildBuiltinWhereClause,
  buildDynamicCatalogWhereClause,
};
