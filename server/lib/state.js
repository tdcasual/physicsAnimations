const { createError } = require("./errors");

const ITEMS_STATE_KEY = "items.json";
const CATEGORIES_STATE_KEY = "categories.json";

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

async function loadItemsState({ store }) {
  const raw = await store.readBuffer(ITEMS_STATE_KEY);
  if (!raw) return { version: 2, items: [] };

  let parsed = null;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    return { version: 2, items: [] };
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
    return { version: 2, items: [] };
  }

  const items = [];
  for (const item of parsed.items) {
    if (!item || typeof item !== "object") continue;
    if (typeof item.id !== "string" || !item.id) continue;

    const type = item.type === "upload" ? "upload" : item.type === "link" ? "link" : "link";
    const base = {
      id: item.id,
      type,
      categoryId: typeof item.categoryId === "string" ? item.categoryId : "other",
      title: typeof item.title === "string" ? item.title : "",
      description: typeof item.description === "string" ? item.description : "",
      thumbnail: typeof item.thumbnail === "string" ? item.thumbnail : "",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
      order: toInt(item.order, 0),
      published: typeof item.published === "boolean" ? item.published : true,
      hidden: typeof item.hidden === "boolean" ? item.hidden : false,
      uploadKind: item.uploadKind === "zip" ? "zip" : item.uploadKind === "html" ? "html" : "html",
    };

    if (type === "upload") {
      items.push({
        ...base,
        path: typeof item.path === "string" ? item.path : "",
      });
      continue;
    }

    items.push({
      ...base,
      url: typeof item.url === "string" ? item.url : "",
    });
  }

  return { version: 2, items };
}

async function saveItemsState({ store, state }) {
  const payload = {
    version: 2,
    items: Array.isArray(state?.items) ? state.items : [],
  };
  const json = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await store.writeBuffer(ITEMS_STATE_KEY, json, { contentType: "application/json; charset=utf-8" });
}

async function loadCategoriesState({ store }) {
  const raw = await store.readBuffer(CATEGORIES_STATE_KEY);
  if (!raw) return { version: 1, categories: {} };

  let parsed = null;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    return { version: 1, categories: {} };
  }

  if (!parsed || typeof parsed !== "object" || !parsed.categories || typeof parsed.categories !== "object") {
    return { version: 1, categories: {} };
  }

  const categories = {};
  for (const [id, category] of Object.entries(parsed.categories)) {
    if (typeof id !== "string" || !id) continue;
    if (!category || typeof category !== "object") continue;

    const title = typeof category.title === "string" ? category.title : "";
    const order = toInt(category.order, 0);
    const hidden = typeof category.hidden === "boolean" ? category.hidden : false;
    categories[id] = { id, title, order, hidden };
  }

  return { version: 1, categories };
}

async function saveCategoriesState({ store, state }) {
  const payload = {
    version: 1,
    categories: state?.categories && typeof state.categories === "object" ? state.categories : {},
  };
  const json = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await store.writeBuffer(CATEGORIES_STATE_KEY, json, { contentType: "application/json; charset=utf-8" });
}

function assertAdmin(req) {
  if (req.user?.role !== "admin") throw createError("missing_token", 401);
}

module.exports = {
  loadItemsState,
  saveItemsState,
  loadCategoriesState,
  saveCategoriesState,
  assertAdmin,
};

