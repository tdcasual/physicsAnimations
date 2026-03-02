function createItemsWriteService({ store, deps }) {
  const {
    mutateItemsState,
    mutateItemTombstonesState,
    normalizeCategoryId,
    noSave,
    toApiItem,
  } = deps;

  async function updateItem({ id, patch }) {
    const dynamicResult = await mutateItemsState({ store }, (state) => {
      const dynamicItem = state.items.find((it) => it.id === id);
      if (!dynamicItem) return noSave(null);
      if (patch.deleted !== undefined) return noSave({ __kind: "unsupported_change" });

      if (patch.title !== undefined) {
        const nextTitle = String(patch.title || "").trim();
        if (!nextTitle) return noSave({ __kind: "invalid_title" });
        dynamicItem.title = nextTitle;
      }
      if (patch.description !== undefined) dynamicItem.description = String(patch.description || "").trim();
      if (patch.categoryId !== undefined) dynamicItem.categoryId = normalizeCategoryId(String(patch.categoryId || "").trim());
      if (patch.order !== undefined) dynamicItem.order = patch.order;
      if (patch.published !== undefined) dynamicItem.published = patch.published;
      if (patch.hidden !== undefined) dynamicItem.hidden = patch.hidden;

      dynamicItem.updatedAt = new Date().toISOString();
      return dynamicItem;
    });

    if (dynamicResult?.__kind === "invalid_title") {
      return { status: 400, error: "invalid_title" };
    }
    if (dynamicResult?.__kind === "unsupported_change") {
      return { status: 400, error: "unsupported_change" };
    }
    if (dynamicResult) {
      return { ok: true, item: toApiItem(dynamicResult) };
    }
    return { status: 404, error: "not_found" };
  }

  async function deleteItem({ id }) {
    const deletedAt = new Date().toISOString();

    const deleted = await mutateItemsState({ store }, async (state) => {
      const item = state.items.find((it) => it.id === id);
      state.items = state.items.filter((it) => it.id !== id);
      if (!item) return noSave(null);

      if (item.type === "upload") {
        await store.deletePath(`uploads/${id}`, { recursive: true });
      }
      if (item.thumbnail) {
        await store.deletePath(`thumbnails/${id}.png`);
      }

      return item;
    });

    if (deleted) {
      try {
        await mutateItemTombstonesState({ store }, (tombstones) => {
          if (!tombstones.tombstones) tombstones.tombstones = {};
          tombstones.tombstones[id] = { deletedAt };
        });
      } catch {
        return { status: 500, error: "tombstone_persist_failed" };
      }
      return { ok: true };
    }
    return { status: 404, error: "not_found" };
  }

  return {
    updateItem,
    deleteItem,
  };
}

module.exports = {
  createItemsWriteService,
};
