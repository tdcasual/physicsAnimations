const ITEMS_STATE_KEY = "items.json";
const CATEGORIES_STATE_KEY = "categories.json";
const BUILTIN_ITEMS_STATE_KEY = "builtin_items.json";
const ITEM_TOMBSTONES_KEY = "items_tombstones.json";
const TAXONOMY_VERSION = 2;
const DEFAULT_GROUP_ID = "physics";

const stateLocks = new Map();
const NO_SAVE = Symbol("state_no_save");

function noSave(value) {
  return { [NO_SAVE]: true, value };
}

async function withStateLock(key, fn) {
  const previous = stateLocks.get(key) || Promise.resolve();
  let release = () => {};
  const current = new Promise((resolve) => {
    release = resolve;
  });
  stateLocks.set(key, current);

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (stateLocks.get(key) === current) stateLocks.delete(key);
  }
}

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

async function mutateItemsState({ store }, mutator) {
  return withStateLock(ITEMS_STATE_KEY, async () => {
    const state = await loadItemsState({ store });
    const result = await mutator(state);
    if (result && result[NO_SAVE]) return result.value;
    await saveItemsState({ store, state });
    return result;
  });
}

async function loadCategoriesState({ store }) {
  const raw = await store.readBuffer(CATEGORIES_STATE_KEY);
  if (!raw) return { version: TAXONOMY_VERSION, groups: {}, categories: {} };

  let parsed = null;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    return { version: TAXONOMY_VERSION, groups: {}, categories: {} };
  }

  if (!parsed || typeof parsed !== "object") {
    return { version: TAXONOMY_VERSION, groups: {}, categories: {} };
  }

  const version = Number(parsed.version || 0);
  const rawGroups = parsed.groups && typeof parsed.groups === "object" ? parsed.groups : {};
  const rawCategories =
    parsed.categories && typeof parsed.categories === "object" ? parsed.categories : {};

  const groups = {};
  const categories = {};

  if (version < TAXONOMY_VERSION) {
    return { version: TAXONOMY_VERSION, groups, categories };
  }

  for (const [id, group] of Object.entries(rawGroups)) {
    if (typeof id !== "string" || !id) continue;
    if (!group || typeof group !== "object") continue;

    const title = typeof group.title === "string" ? group.title : "";
    const order = toInt(group.order, 0);
    const hidden = typeof group.hidden === "boolean" ? group.hidden : false;
    groups[id] = { id, title, order, hidden };
  }

  for (const [id, category] of Object.entries(rawCategories)) {
    if (typeof id !== "string" || !id) continue;
    if (!category || typeof category !== "object") continue;

    const title = typeof category.title === "string" ? category.title : "";
    const order = toInt(category.order, 0);
    const hidden = typeof category.hidden === "boolean" ? category.hidden : false;
    const groupId =
      typeof category.groupId === "string" && category.groupId
        ? category.groupId
        : DEFAULT_GROUP_ID;
    categories[id] = { id, groupId, title, order, hidden };
  }

  return { version: TAXONOMY_VERSION, groups, categories };
}

async function saveCategoriesState({ store, state }) {
  const payload = {
    version: TAXONOMY_VERSION,
    groups: state?.groups && typeof state.groups === "object" ? state.groups : {},
    categories: state?.categories && typeof state.categories === "object" ? state.categories : {},
  };
  const json = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await store.writeBuffer(CATEGORIES_STATE_KEY, json, { contentType: "application/json; charset=utf-8" });
}

async function mutateCategoriesState({ store }, mutator) {
  return withStateLock(CATEGORIES_STATE_KEY, async () => {
    const state = await loadCategoriesState({ store });
    const result = await mutator(state);
    if (result && result[NO_SAVE]) return result.value;
    await saveCategoriesState({ store, state });
    return result;
  });
}

async function loadBuiltinItemsState({ store }) {
  const raw = await store.readBuffer(BUILTIN_ITEMS_STATE_KEY);
  if (!raw) return { version: 1, items: {} };

  let parsed = null;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    return { version: 1, items: {} };
  }

  if (!parsed || typeof parsed !== "object" || !parsed.items || typeof parsed.items !== "object") {
    return { version: 1, items: {} };
  }

  const items = {};
  for (const [id, value] of Object.entries(parsed.items)) {
    if (typeof id !== "string" || !id) continue;
    if (!value || typeof value !== "object") continue;

    const entry = {};
    if (typeof value.title === "string") entry.title = value.title;
    if (typeof value.description === "string") entry.description = value.description;
    if (typeof value.categoryId === "string") entry.categoryId = value.categoryId;
    if (Number.isFinite(value.order)) entry.order = toInt(value.order, 0);
    if (typeof value.published === "boolean") entry.published = value.published;
    if (typeof value.hidden === "boolean") entry.hidden = value.hidden;
    if (typeof value.deleted === "boolean") entry.deleted = value.deleted;
    if (typeof value.updatedAt === "string") entry.updatedAt = value.updatedAt;

    items[id] = entry;
  }

  return { version: 1, items };
}

async function loadItemTombstonesState({ store }) {
  const raw = await store.readBuffer(ITEM_TOMBSTONES_KEY);
  if (!raw) return { version: 1, tombstones: {} };

  let parsed = null;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    return { version: 1, tombstones: {} };
  }

  if (!parsed || typeof parsed !== "object" || !parsed.tombstones || typeof parsed.tombstones !== "object") {
    return { version: 1, tombstones: {} };
  }

  const tombstones = {};
  for (const [id, value] of Object.entries(parsed.tombstones)) {
    if (typeof id !== "string" || !id) continue;
    if (!value || typeof value !== "object") continue;
    if (typeof value.deletedAt !== "string" || !value.deletedAt) continue;
    tombstones[id] = { deletedAt: value.deletedAt };
  }

  return { version: 1, tombstones };
}

async function saveItemTombstonesState({ store, state }) {
  const payload = {
    version: 1,
    tombstones: state?.tombstones && typeof state.tombstones === "object" ? state.tombstones : {},
  };
  const json = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await store.writeBuffer(ITEM_TOMBSTONES_KEY, json, { contentType: "application/json; charset=utf-8" });
}

async function mutateItemTombstonesState({ store }, mutator) {
  return withStateLock(ITEM_TOMBSTONES_KEY, async () => {
    const state = await loadItemTombstonesState({ store });
    const result = await mutator(state);
    if (result && result[NO_SAVE]) return result.value;
    await saveItemTombstonesState({ store, state });
    return result;
  });
}

async function saveBuiltinItemsState({ store, state }) {
  const payload = {
    version: 1,
    items: state?.items && typeof state.items === "object" ? state.items : {},
  };
  const json = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await store.writeBuffer(BUILTIN_ITEMS_STATE_KEY, json, {
    contentType: "application/json; charset=utf-8",
  });
}

async function mutateBuiltinItemsState({ store }, mutator) {
  return withStateLock(BUILTIN_ITEMS_STATE_KEY, async () => {
    const state = await loadBuiltinItemsState({ store });
    const result = await mutator(state);
    if (result && result[NO_SAVE]) return result.value;
    await saveBuiltinItemsState({ store, state });
    return result;
  });
}

module.exports = {
  loadItemsState,
  saveItemsState,
  mutateItemsState,
  loadCategoriesState,
  saveCategoriesState,
  mutateCategoriesState,
  loadBuiltinItemsState,
  saveBuiltinItemsState,
  mutateBuiltinItemsState,
  loadItemTombstonesState,
  saveItemTombstonesState,
  mutateItemTombstonesState,
  noSave,
};
