const { createAdapterRegistry } = require("./registry");
const { isValidAdapter } = require("./contract");
const { createGeogebraAdapter } = require("./geogebra");
const { createPhETAdapter } = require("./phet");

function createDefaultLibraryAdapterRegistry() {
  return createAdapterRegistry([createGeogebraAdapter(), createPhETAdapter()]);
}

module.exports = {
  createDefaultLibraryAdapterRegistry,
  createAdapterRegistry,
  isValidAdapter,
  createGeogebraAdapter,
  createPhETAdapter,
};
