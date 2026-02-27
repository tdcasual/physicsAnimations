const { listBuiltinItems, findBuiltinItem } = require("../../lib/animationsIndex");
const { loadBuiltinItemsState } = require("../../lib/state");
const { normalizeCategoryId: defaultNormalizeCategoryId } = require("./itemModel");

function applyBuiltinOverride(item, override, normalizeCategoryId) {
  if (typeof override?.title === "string" && override.title.trim()) {
    item.title = override.title.trim();
  }
  if (typeof override?.description === "string") {
    item.description = override.description;
  }
  if (typeof override?.categoryId === "string" && override.categoryId.trim()) {
    item.categoryId = normalizeCategoryId(override.categoryId);
  }
  if (Number.isFinite(override?.order)) {
    item.order = Math.trunc(override.order);
  }
  if (typeof override?.published === "boolean") {
    item.published = override.published;
  }
  if (typeof override?.hidden === "boolean") {
    item.hidden = override.hidden;
  }
  if (typeof override?.updatedAt === "string") {
    item.updatedAt = override.updatedAt;
  }
  if (override?.deleted === true) {
    item.deleted = true;
  }
}

function toBuiltinItem(base) {
  return {
    id: base.id,
    type: "builtin",
    categoryId: base.categoryId,
    title: base.title,
    description: base.description,
    thumbnail: base.thumbnail,
    order: 0,
    published: true,
    hidden: false,
    createdAt: "",
    updatedAt: "",
  };
}

function createItemsBuiltinService({ rootDir, store, deps = {} }) {
  const listBuiltinItemsImpl = deps.listBuiltinItems || listBuiltinItems;
  const findBuiltinItemImpl = deps.findBuiltinItem || findBuiltinItem;
  const loadBuiltinItemsStateImpl = deps.loadBuiltinItemsState || loadBuiltinItemsState;
  const normalizeCategoryId = deps.normalizeCategoryId || defaultNormalizeCategoryId;

  function loadBuiltinIndex() {
    return listBuiltinItemsImpl({ rootDir }).map(toBuiltinItem);
  }

  async function loadBuiltinItems({ includeDeleted = false } = {}) {
    const base = loadBuiltinIndex();
    if (!base.length) return [];

    const state = await loadBuiltinItemsStateImpl({ store });
    const overrides =
      state?.items && typeof state.items === "object" ? state.items : {};

    const merged = [];
    for (const item of base) {
      const override = overrides[item.id];
      if (override?.deleted === true && !includeDeleted) continue;

      const out = { ...item };
      applyBuiltinOverride(out, override, normalizeCategoryId);
      merged.push(out);
    }

    return merged;
  }

  async function findBuiltinItemById(id, { includeDeleted = false } = {}) {
    const base = findBuiltinItemImpl({ rootDir, id });
    if (!base) return null;

    const state = await loadBuiltinItemsStateImpl({ store });
    const override = state?.items?.[id];
    if (override?.deleted === true && !includeDeleted) return null;

    const out = toBuiltinItem(base);
    applyBuiltinOverride(out, override, normalizeCategoryId);
    return out;
  }

  return {
    loadBuiltinIndex,
    loadBuiltinItems,
    findBuiltinItemById,
  };
}

module.exports = {
  createItemsBuiltinService,
};
