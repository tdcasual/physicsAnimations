function createItemsWriteService({ store, deps }) {
  const {
    mutateItemsState,
    mutateBuiltinItemsState,
    mutateItemTombstonesState,
    normalizeCategoryId,
    noSave,
    loadBuiltinIndex,
    findBuiltinItemById,
    toApiItem,
  } = deps;

  async function updateItem({ id, patch }) {
    const dynamicResult = await mutateItemsState({ store }, (state) => {
      const dynamicItem = state.items.find((it) => it.id === id);
      if (!dynamicItem) return noSave(null);
      if (patch.deleted !== undefined) return noSave({ __kind: "unsupported_change" });

      if (patch.title !== undefined) dynamicItem.title = patch.title;
      if (patch.description !== undefined) dynamicItem.description = patch.description;
      if (patch.categoryId !== undefined) dynamicItem.categoryId = normalizeCategoryId(patch.categoryId);
      if (patch.order !== undefined) dynamicItem.order = patch.order;
      if (patch.published !== undefined) dynamicItem.published = patch.published;
      if (patch.hidden !== undefined) dynamicItem.hidden = patch.hidden;

      dynamicItem.updatedAt = new Date().toISOString();
      return dynamicItem;
    });

    if (dynamicResult?.__kind === "unsupported_change") {
      return { status: 400, error: "unsupported_change" };
    }
    if (dynamicResult) {
      return { ok: true, item: toApiItem(dynamicResult) };
    }

    const builtinBase = loadBuiltinIndex().find((it) => it.id === id);
    if (!builtinBase) {
      return { status: 404, error: "not_found" };
    }

    await mutateBuiltinItemsState({ store }, (builtinState) => {
      if (!builtinState.items) builtinState.items = {};
      const current =
        builtinState.items[id] && typeof builtinState.items[id] === "object"
          ? { ...builtinState.items[id] }
          : {};

      if (patch.title !== undefined) {
        const title = String(patch.title || "").trim();
        if (!title) delete current.title;
        else current.title = title;
      }
      if (patch.description !== undefined) {
        const desc = String(patch.description || "");
        if (!desc.trim()) delete current.description;
        else current.description = desc;
      }
      if (patch.categoryId !== undefined) {
        const raw = String(patch.categoryId || "").trim();
        if (!raw) delete current.categoryId;
        else current.categoryId = normalizeCategoryId(raw);
      }
      if (patch.order !== undefined) current.order = patch.order;
      if (patch.published !== undefined) current.published = patch.published;
      if (patch.hidden !== undefined) current.hidden = patch.hidden;
      if (patch.deleted === true) current.deleted = true;
      if (patch.deleted === false) delete current.deleted;

      current.updatedAt = new Date().toISOString();

      const hasAnyOverride = Object.entries(current).some(
        ([key, value]) => key !== "updatedAt" && value !== undefined,
      );
      if (hasAnyOverride) builtinState.items[id] = current;
      else delete builtinState.items[id];
    });

    const updated = await findBuiltinItemById(id, { includeDeleted: true });
    if (!updated) {
      return { status: 404, error: "not_found" };
    }

    return { ok: true, item: toApiItem(updated) };
  }

  async function deleteItem({ id }) {
    const deletedAt = new Date().toISOString();

    const deleted = await mutateItemsState({ store }, async (state) => {
      const before = state.items.length;
      const item = state.items.find((it) => it.id === id);
      state.items = state.items.filter((it) => it.id !== id);
      if (!item || state.items.length === before) return noSave(null);

      if (item.type === "upload") {
        await store.deletePath(`uploads/${id}`, { recursive: true });
      }
      if (item.thumbnail) {
        await store.deletePath(`thumbnails/${id}.png`);
      }

      return item;
    });

    if (deleted) {
      await mutateItemTombstonesState({ store }, (tombstones) => {
        if (!tombstones.tombstones) tombstones.tombstones = {};
        tombstones.tombstones[id] = { deletedAt };
      }).catch(() => {});
      return { ok: true };
    }

    const builtinBase = loadBuiltinIndex().find((it) => it.id === id);
    if (!builtinBase) {
      return { status: 404, error: "not_found" };
    }

    await mutateBuiltinItemsState({ store }, (builtinState) => {
      if (!builtinState.items) builtinState.items = {};
      const current =
        builtinState.items[id] && typeof builtinState.items[id] === "object"
          ? { ...builtinState.items[id] }
          : {};

      current.deleted = true;
      current.updatedAt = new Date().toISOString();
      builtinState.items[id] = current;
    });

    return { ok: true };
  }

  return {
    updateItem,
    deleteItem,
  };
}

module.exports = {
  createItemsWriteService,
};

