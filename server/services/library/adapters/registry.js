const { isValidAdapter } = require("./contract");

function createAdapterRegistry(adapters = []) {
  const list = [];
  for (const adapter of adapters) {
    if (!isValidAdapter(adapter)) continue;
    list.push(adapter);
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
