function createAdapterRegistry(adapters = []) {
  const list = [];
  for (const adapter of adapters) {
    if (!adapter || typeof adapter !== "object") continue;
    if (typeof adapter.key !== "string" || !adapter.key.trim()) continue;
    if (typeof adapter.match !== "function") continue;
    list.push({
      ...adapter,
      buildViewer:
        typeof adapter.buildViewer === "function"
          ? adapter.buildViewer
          : async () => ({ generated: false, html: "" }),
    });
  }

  function findForFile(input) {
    for (const adapter of list) {
      let matched = false;
      try {
        matched = adapter.match(input) === true;
      } catch {
        matched = false;
      }
      if (matched) return adapter;
    }
    return null;
  }

  function getByKey(key) {
    const normalized = String(key || "");
    return list.find((adapter) => adapter.key === normalized) || null;
  }

  return {
    adapters: list.slice(),
    findForFile,
    getByKey,
  };
}

module.exports = {
  createAdapterRegistry,
};
