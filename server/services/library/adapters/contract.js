function isValidAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") return false;
  if (typeof adapter.key !== "string" || !adapter.key.trim()) return false;
  if (typeof adapter.match !== "function") return false;
  if (typeof adapter.buildViewer !== "function") return false;
  if (!adapter.capabilities || typeof adapter.capabilities !== "object") return false;
  if (typeof adapter.capabilities.supportsEmbed !== "boolean") return false;
  if (typeof adapter.capabilities.supportsDownload !== "boolean") return false;
  return true;
}

module.exports = {
  isValidAdapter,
};
