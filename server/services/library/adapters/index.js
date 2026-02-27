const { createAdapterRegistry } = require("./registry");
const { createGeogebraAdapter } = require("./geogebra");

function createDefaultLibraryAdapterRegistry() {
  return createAdapterRegistry([createGeogebraAdapter()]);
}

module.exports = {
  createDefaultLibraryAdapterRegistry,
  createAdapterRegistry,
  createGeogebraAdapter,
};
