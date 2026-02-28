const { createAssetsReadOps } = require("./assetsService/readOps");
const { createAssetsWriteOps } = require("./assetsService/writeOps");

function createAssetsService({
  store,
  adapterRegistry,
  loadLibraryAssetsState,
  mutateLibraryAssetsState,
  getFolderById,
  getEmbedProfileById,
  generateViewerFromAssetMeta,
}) {
  const readOps = createAssetsReadOps({
    store,
    loadLibraryAssetsState,
  });

  const writeOps = createAssetsWriteOps({
    store,
    adapterRegistry,
    mutateLibraryAssetsState,
    getFolderById,
    getEmbedProfileById,
    generateViewerFromAssetMeta,
    getAssetById: readOps.getAssetById,
  });

  return {
    ...readOps,
    ...writeOps,
  };
}

module.exports = {
  createAssetsService,
};
