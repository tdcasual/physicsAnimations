const {
  loadLibraryFoldersState: defaultLoadLibraryFoldersState,
  mutateLibraryFoldersState: defaultMutateLibraryFoldersState,
  loadLibraryAssetsState: defaultLoadLibraryAssetsState,
  mutateLibraryAssetsState: defaultMutateLibraryAssetsState,
  loadLibraryEmbedProfilesState: defaultLoadLibraryEmbedProfilesState,
  mutateLibraryEmbedProfilesState: defaultMutateLibraryEmbedProfilesState,
} = require("../../lib/libraryState");
const { normalizeCategoryId } = require("../items/itemModel");
const { createDefaultLibraryAdapterRegistry } = require("./adapters");
const { createAssetsService } = require("./assetsService");
const { createEmbedProfileSync } = require("./core/embedProfileSync");
const { createEmbedProfilesService } = require("./embedProfilesService");
const { createFoldersService } = require("./foldersService");
const { createViewerRenderService } = require("./viewerRenderService");

function createLibraryService({ store, deps = {} }) {
  if (!store || typeof store.readBuffer !== "function" || typeof store.writeBuffer !== "function") {
    throw new TypeError("createLibraryService requires a valid store");
  }

  const loadLibraryFoldersState = deps.loadLibraryFoldersState || defaultLoadLibraryFoldersState;
  const mutateLibraryFoldersState = deps.mutateLibraryFoldersState || defaultMutateLibraryFoldersState;
  const loadLibraryAssetsState = deps.loadLibraryAssetsState || defaultLoadLibraryAssetsState;
  const mutateLibraryAssetsState = deps.mutateLibraryAssetsState || defaultMutateLibraryAssetsState;
  const loadLibraryEmbedProfilesState = deps.loadLibraryEmbedProfilesState || defaultLoadLibraryEmbedProfilesState;
  const mutateLibraryEmbedProfilesState = deps.mutateLibraryEmbedProfilesState || defaultMutateLibraryEmbedProfilesState;
  const adapterRegistry = deps.adapterRegistry || createDefaultLibraryAdapterRegistry();
  const fetcher = deps.fetcher || (typeof fetch === "function" ? fetch.bind(globalThis) : null);

  let embedProfilesService = null;
  const embedProfileSyncService = createEmbedProfileSync({
    store,
    fetcher,
    getEmbedProfileById: (...args) => embedProfilesService?.getEmbedProfileById(...args),
    mutateLibraryEmbedProfilesState,
  });

  embedProfilesService = createEmbedProfilesService({
    store,
    loadLibraryEmbedProfilesState,
    mutateLibraryEmbedProfilesState,
    loadLibraryAssetsState,
    mirrorEmbedProfileResources: embedProfileSyncService.mirrorEmbedProfileResources,
  });
  const { listEmbedProfiles, getEmbedProfileById, createEmbedProfile, updateEmbedProfile, deleteEmbedProfile } =
    embedProfilesService;
  const { syncEmbedProfile } = embedProfileSyncService;

  const { generateViewerFromAssetMeta } = createViewerRenderService({
    store,
    adapterRegistry,
    getEmbedProfileById,
  });

  const { listFolders, getFolderById, createFolder, updateFolder, uploadFolderCover, deleteFolder, getCatalogSummary } =
    createFoldersService({
      store,
      normalizeCategoryId,
      loadLibraryFoldersState,
      mutateLibraryFoldersState,
      loadLibraryAssetsState,
      mutateLibraryAssetsState,
    });

  const {
    listFolderAssets,
    getAssetById,
    listDeletedAssets,
    uploadAsset,
    updateAsset,
    getAssetOpenInfo,
    deleteAsset,
    deleteAssetPermanently,
    restoreAsset,
  } = createAssetsService({
    store,
    adapterRegistry,
    loadLibraryAssetsState,
    mutateLibraryAssetsState,
    getFolderById,
    getEmbedProfileById,
    generateViewerFromAssetMeta,
  });

  return {
    listEmbedProfiles,
    getEmbedProfileById,
    createEmbedProfile,
    updateEmbedProfile,
    syncEmbedProfile,
    deleteEmbedProfile,
    createFolder,
    updateFolder,
    listFolders,
    getFolderById,
    uploadFolderCover,
    uploadAsset,
    listFolderAssets,
    listDeletedAssets,
    getAssetById,
    getAssetOpenInfo,
    updateAsset,
    getCatalogSummary,
    deleteFolder,
    deleteAsset,
    deleteAssetPermanently,
    restoreAsset,
  };
}

module.exports = {
  createLibraryService,
};
