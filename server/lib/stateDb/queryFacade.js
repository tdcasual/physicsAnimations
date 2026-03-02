function createStateDbQueryFacade({
  mirror,
  ensureDynamicItemsIndexed,
  ensureBuiltinItemsIndexed,
  runMirrorOperation,
  ensureUsable,
}) {
  return {
    async queryDynamicItems(options = {}) {
      ensureUsable();
      await ensureDynamicItemsIndexed();
      return runMirrorOperation("mirror.queryDynamicItems", () => mirror.queryDynamicItems(options));
    },
    async queryDynamicItemsForCatalog(options = {}) {
      ensureUsable();
      await ensureDynamicItemsIndexed();
      return runMirrorOperation("mirror.queryDynamicItemsForCatalog", () =>
        mirror.queryDynamicItemsForCatalog(options),
      );
    },
    async queryBuiltinItems(options = {}) {
      ensureUsable();
      await ensureBuiltinItemsIndexed();
      return runMirrorOperation("mirror.queryBuiltinItems", () => mirror.queryBuiltinItems(options));
    },
    async queryItems(options = {}) {
      ensureUsable();
      await ensureDynamicItemsIndexed();
      await ensureBuiltinItemsIndexed();
      return runMirrorOperation("mirror.queryItems", () => mirror.queryItems(options));
    },
    async queryItemById(options = {}) {
      ensureUsable();
      await ensureDynamicItemsIndexed();
      await ensureBuiltinItemsIndexed();

      return runMirrorOperation("mirror.queryItemById", () =>
        mirror.queryItemById({
          id: String(options.id || ""),
          isAdmin: options.isAdmin === true,
          includeDeleted: options.includeDeleted === true,
        }),
      );
    },
    async queryDynamicCategoryCounts(options = {}) {
      ensureUsable();
      await ensureDynamicItemsIndexed();
      return runMirrorOperation("mirror.queryDynamicCategoryCounts", () =>
        mirror.queryDynamicCategoryCounts(options),
      );
    },
  };
}

module.exports = {
  createStateDbQueryFacade,
};
