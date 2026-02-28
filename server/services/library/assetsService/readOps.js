function createAssetsReadOps({ store, loadLibraryAssetsState }) {
  async function listFolderAssets({ folderId, includeDeleted = false, deletedOnly = false } = {}) {
    const id = String(folderId || "");
    const state = await loadLibraryAssetsState({ store });
    const all = Array.isArray(state?.assets) ? state.assets : [];
    return all.filter((item) => {
      if (String(item.folderId || "") !== id) return false;
      const isDeleted = item.deleted === true;
      if (deletedOnly) return isDeleted;
      if (!includeDeleted && isDeleted) return false;
      return true;
    });
  }

  async function getAssetById({ assetId, includeDeleted = false } = {}) {
    const id = String(assetId || "");
    if (!id) return null;
    const state = await loadLibraryAssetsState({ store });
    const all = Array.isArray(state?.assets) ? state.assets : [];
    const found = all.find((item) => item.id === id) || null;
    if (!found) return null;
    if (!includeDeleted && found.deleted === true) return null;
    return found;
  }

  async function listDeletedAssets({ folderId } = {}) {
    const folder = String(folderId || "").trim();
    const state = await loadLibraryAssetsState({ store });
    const all = Array.isArray(state?.assets) ? state.assets : [];
    return all.filter((item) => {
      if (item.deleted !== true) return false;
      if (!folder) return true;
      return String(item.folderId || "") === folder;
    });
  }

  async function getAssetOpenInfo({ assetId }) {
    const asset = await getAssetById({ assetId });
    if (!asset) return { status: 404, error: "asset_not_found" };

    const mode = asset.openMode === "embed" && asset.generatedEntryPath ? "embed" : "download";
    const openPath = mode === "embed" ? asset.generatedEntryPath : asset.filePath;
    const openUrl = `/${String(openPath || "").replace(/^\/+/, "")}`;
    const downloadUrl = `/${String(asset.filePath || "").replace(/^\/+/, "")}`;

    return {
      ok: true,
      asset,
      mode,
      openUrl,
      downloadUrl,
    };
  }

  return {
    listFolderAssets,
    getAssetById,
    listDeletedAssets,
    getAssetOpenInfo,
  };
}

module.exports = {
  createAssetsReadOps,
};
