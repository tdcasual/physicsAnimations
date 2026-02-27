const crypto = require("crypto");
const path = require("path");

const {
  normalizeOpenMode,
  sanitizeFileName,
  toPublicPath,
  normalizeJsonObject,
} = require("./core/normalizers");

function createAssetsService({
  store,
  adapterRegistry,
  loadLibraryAssetsState,
  mutateLibraryAssetsState,
  getFolderById,
  getEmbedProfileById,
  generateViewerFromAssetMeta,
}) {
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

  async function uploadAsset({ folderId, fileBuffer, originalName, openMode, displayName, embedProfileId, embedOptions }) {
    const folder = await getFolderById({ folderId });
    if (!folder) return { status: 404, error: "folder_not_found" };
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) return { status: 400, error: "missing_file" };

    const mode = normalizeOpenMode(openMode);
    if (!mode) return { status: 400, error: "invalid_open_mode" };
    const normalizedEmbedOptions = normalizeJsonObject(embedOptions);
    if (normalizedEmbedOptions === null) return { status: 400, error: "invalid_embed_options" };

    const safeName = sanitizeFileName(originalName, "asset.ggb");
    const profileId = String(embedProfileId || "").trim();
    let selectedProfile = null;
    let adapter = null;
    if (profileId) {
      selectedProfile = await getEmbedProfileById({ profileId });
      if (!selectedProfile || selectedProfile.enabled === false) return { status: 400, error: "embed_profile_not_found" };
      const ext = path.extname(safeName).replace(/^\./, "").toLowerCase();
      if (Array.isArray(selectedProfile.matchExtensions) && selectedProfile.matchExtensions.length > 0) {
        if (!selectedProfile.matchExtensions.includes(ext)) {
          return { status: 400, error: "embed_profile_extension_mismatch" };
        }
      }
    } else {
      adapter = adapterRegistry.findForFile({ fileName: safeName, fileBuffer });
      if (!adapter) return { status: 400, error: "unsupported_asset_type" };
    }

    const now = new Date().toISOString();
    const assetId = `a_${crypto.randomUUID()}`;
    const sourceKey = `library/assets/${assetId}/source/${safeName}`;
    const sourcePublicPath = toPublicPath(sourceKey);
    let generatedEntryPath = "";

    await store.writeBuffer(sourceKey, fileBuffer, { contentType: "application/octet-stream" });

    if (mode === "embed") {
      try {
        const renderResult = await generateViewerFromAssetMeta({
          assetId,
          assetPublicFileUrl: `/${sourcePublicPath}`,
          fileName: safeName,
          adapterKey: adapter?.key || "",
          embedProfileId: selectedProfile?.id || "",
          embedOptions: normalizedEmbedOptions,
        });
        if (renderResult?.error) {
          await store.deletePath(`library/assets/${assetId}`, { recursive: true }).catch(() => {});
          return renderResult;
        }
        generatedEntryPath = renderResult.generatedEntryPath;
      } catch {
        await store.deletePath(`library/assets/${assetId}`, { recursive: true }).catch(() => {});
        return { status: 500, error: "adapter_render_failed" };
      }
    }

    const asset = {
      id: assetId,
      folderId: folder.id,
      adapterKey: adapter ? adapter.key : `embed:${selectedProfile.id}`,
      displayName: String(displayName || "").trim(),
      fileName: safeName,
      filePath: sourcePublicPath,
      fileSize: fileBuffer.length,
      openMode: mode,
      generatedEntryPath,
      embedProfileId: selectedProfile?.id || "",
      embedOptions: normalizedEmbedOptions,
      status: "ready",
      deleted: false,
      deletedAt: "",
      createdAt: now,
      updatedAt: now,
    };

    await mutateLibraryAssetsState({ store }, (state) => {
      state.assets.push(asset);
    });

    return { ok: true, asset };
  }

  async function updateAsset({ assetId, displayName, openMode, folderId, embedProfileId, embedOptions }) {
    const asset = await getAssetById({ assetId });
    if (!asset) return { status: 404, error: "asset_not_found" };

    const openModeInputProvided = openMode !== undefined;
    const normalizedOpenMode = openModeInputProvided ? normalizeOpenMode(openMode) : "";
    if (openModeInputProvided && !normalizedOpenMode) return { status: 400, error: "invalid_open_mode" };

    const displayNameInputProvided = displayName !== undefined;
    const folderInputProvided = folderId !== undefined;
    const embedProfileInputProvided = embedProfileId !== undefined;
    const embedOptionsInputProvided = embedOptions !== undefined;
    const now = new Date().toISOString();
    const nextDisplayName = displayNameInputProvided ? String(displayName || "").trim() : asset.displayName;
    let nextFolderId = asset.folderId;
    let nextAdapterKey = asset.adapterKey || "";
    let nextEmbedProfileId = asset.embedProfileId || "";
    let nextEmbedOptions = normalizeJsonObject(asset.embedOptions) || {};
    let nextOpenMode = asset.openMode;
    let nextGeneratedEntryPath = asset.generatedEntryPath || "";

    if (folderInputProvided) {
      const nextFolder = await getFolderById({ folderId: String(folderId || "") });
      if (!nextFolder) return { status: 404, error: "folder_not_found" };
      nextFolderId = nextFolder.id;
    }
    if (embedProfileInputProvided) {
      const profileId = String(embedProfileId || "").trim();
      if (profileId) {
        const profile = await getEmbedProfileById({ profileId });
        if (!profile || profile.enabled === false) return { status: 400, error: "embed_profile_not_found" };
        const ext = path.extname(String(asset.fileName || "")).replace(/^\./, "").toLowerCase();
        if (Array.isArray(profile.matchExtensions) && profile.matchExtensions.length > 0) {
          if (!profile.matchExtensions.includes(ext)) {
            return { status: 400, error: "embed_profile_extension_mismatch" };
          }
        }
        nextEmbedProfileId = profile.id;
        nextAdapterKey = `embed:${profile.id}`;
      } else {
        const adapter = adapterRegistry.findForFile({ fileName: asset.fileName });
        if (!adapter) return { status: 400, error: "unsupported_asset_type" };
        nextEmbedProfileId = "";
        nextAdapterKey = adapter.key;
      }
    }
    if (embedOptionsInputProvided) {
      const normalizedEmbedOptions = normalizeJsonObject(embedOptions);
      if (normalizedEmbedOptions === null) return { status: 400, error: "invalid_embed_options" };
      nextEmbedOptions = normalizedEmbedOptions;
    }

    if (openModeInputProvided) {
      nextOpenMode = normalizedOpenMode;
      if (normalizedOpenMode === "download") {
        nextGeneratedEntryPath = "";
      }
    }

    const shouldRegenerateViewer =
      nextOpenMode === "embed" &&
      (!nextGeneratedEntryPath ||
        (openModeInputProvided && asset.openMode !== "embed") ||
        (embedProfileInputProvided && nextEmbedProfileId !== (asset.embedProfileId || "")) ||
        (embedOptionsInputProvided &&
          JSON.stringify(nextEmbedOptions) !== JSON.stringify(normalizeJsonObject(asset.embedOptions) || {})) ||
        (embedProfileInputProvided && nextAdapterKey !== (asset.adapterKey || "")));
    if (shouldRegenerateViewer) {
      try {
        const renderResult = await generateViewerFromAssetMeta({
          assetId: asset.id,
          assetPublicFileUrl: `/${String(asset.filePath || "").replace(/^\/+/, "")}`,
          fileName: asset.fileName,
          adapterKey: nextAdapterKey,
          embedProfileId: nextEmbedProfileId,
          embedOptions: nextEmbedOptions,
        });
        if (renderResult?.error) return renderResult;
        nextGeneratedEntryPath = renderResult.generatedEntryPath;
      } catch {
        return { status: 500, error: "adapter_render_failed" };
      }
    }

    let updatedAsset = null;
    await mutateLibraryAssetsState({ store }, (state) => {
      const target = state.assets.find((item) => item.id === asset.id);
      if (!target) return;
      if (displayNameInputProvided) target.displayName = nextDisplayName;
      target.folderId = nextFolderId;
      target.adapterKey = nextAdapterKey;
      target.embedProfileId = nextEmbedProfileId;
      target.embedOptions = nextEmbedOptions;
      target.openMode = nextOpenMode;
      target.generatedEntryPath = nextGeneratedEntryPath;
      target.updatedAt = now;
      updatedAsset = { ...target };
    });

    if (!updatedAsset) return { status: 404, error: "asset_not_found" };
    return { ok: true, asset: updatedAsset };
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

  async function deleteAsset({ assetId }) {
    const asset = await getAssetById({ assetId, includeDeleted: true });
    if (!asset) return { status: 404, error: "asset_not_found" };
    if (asset.deleted === true) return { ok: true, asset };

    const now = new Date().toISOString();
    let deletedAsset = null;
    await mutateLibraryAssetsState({ store }, (state) => {
      const target = state.assets.find((item) => item.id === asset.id);
      if (!target) return;
      target.deleted = true;
      target.deletedAt = now;
      target.updatedAt = now;
      deletedAsset = { ...target };
    });

    if (!deletedAsset) return { status: 404, error: "asset_not_found" };
    return { ok: true, asset: deletedAsset };
  }

  async function deleteAssetPermanently({ assetId }) {
    const asset = await getAssetById({ assetId, includeDeleted: true });
    if (!asset) return { status: 404, error: "asset_not_found" };
    if (asset.deleted !== true) return { status: 409, error: "asset_not_deleted" };

    let removed = null;
    await mutateLibraryAssetsState({ store }, (state) => {
      const index = state.assets.findIndex((item) => item.id === asset.id);
      if (index === -1) return;
      removed = state.assets[index];
      state.assets.splice(index, 1);
    });
    if (!removed) return { status: 404, error: "asset_not_found" };
    await store.deletePath(`library/assets/${asset.id}`, { recursive: true }).catch(() => {});
    return { ok: true, asset: removed, permanent: true };
  }

  async function restoreAsset({ assetId }) {
    const asset = await getAssetById({ assetId, includeDeleted: true });
    if (!asset) return { status: 404, error: "asset_not_found" };
    if (asset.deleted !== true) return { ok: true, asset };

    let nextAdapterKey = String(asset.adapterKey || "");
    let nextEmbedProfileId = String(asset.embedProfileId || "");
    let nextEmbedOptions = normalizeJsonObject(asset.embedOptions) || {};
    let nextOpenMode = asset.openMode === "download" ? "download" : "embed";
    let nextGeneratedEntryPath = String(asset.generatedEntryPath || "");

    if (nextOpenMode === "embed") {
      let shouldRegenerateViewer = !nextGeneratedEntryPath;
      if (nextEmbedProfileId) {
        const profile = await getEmbedProfileById({ profileId: nextEmbedProfileId });
        if (!profile || profile.enabled === false) {
          const fallbackAdapter = adapterRegistry.findForFile({ fileName: String(asset.fileName || "") });
          if (fallbackAdapter) {
            nextAdapterKey = fallbackAdapter.key;
            nextEmbedProfileId = "";
            nextEmbedOptions = {};
            shouldRegenerateViewer = true;
          } else {
            nextAdapterKey = "";
            nextEmbedProfileId = "";
            nextEmbedOptions = {};
            nextOpenMode = "download";
            nextGeneratedEntryPath = "";
            shouldRegenerateViewer = false;
          }
        }
      } else if (!nextAdapterKey) {
        const fallbackAdapter = adapterRegistry.findForFile({ fileName: String(asset.fileName || "") });
        if (fallbackAdapter) {
          nextAdapterKey = fallbackAdapter.key;
          shouldRegenerateViewer = true;
        } else {
          nextOpenMode = "download";
          nextGeneratedEntryPath = "";
          shouldRegenerateViewer = false;
        }
      }

      if (nextOpenMode === "embed" && shouldRegenerateViewer) {
        try {
          const renderResult = await generateViewerFromAssetMeta({
            assetId: asset.id,
            assetPublicFileUrl: `/${String(asset.filePath || "").replace(/^\/+/, "")}`,
            fileName: String(asset.fileName || ""),
            adapterKey: nextAdapterKey,
            embedProfileId: nextEmbedProfileId,
            embedOptions: nextEmbedOptions,
          });
          if (renderResult?.error) {
            nextAdapterKey = "";
            nextEmbedProfileId = "";
            nextEmbedOptions = {};
            nextOpenMode = "download";
            nextGeneratedEntryPath = "";
          } else {
            nextGeneratedEntryPath = renderResult.generatedEntryPath;
          }
        } catch {
          nextAdapterKey = "";
          nextEmbedProfileId = "";
          nextEmbedOptions = {};
          nextOpenMode = "download";
          nextGeneratedEntryPath = "";
        }
      }
    }

    const now = new Date().toISOString();
    let restoredAsset = null;
    await mutateLibraryAssetsState({ store }, (state) => {
      const target = state.assets.find((item) => item.id === asset.id);
      if (!target) return;
      target.adapterKey = nextAdapterKey;
      target.embedProfileId = nextEmbedProfileId;
      target.embedOptions = nextEmbedOptions;
      target.openMode = nextOpenMode;
      target.generatedEntryPath = nextGeneratedEntryPath;
      target.deleted = false;
      target.deletedAt = "";
      target.updatedAt = now;
      restoredAsset = { ...target };
    });

    if (!restoredAsset) return { status: 404, error: "asset_not_found" };
    return { ok: true, asset: restoredAsset };
  }

  return {
    listFolderAssets,
    getAssetById,
    listDeletedAssets,
    uploadAsset,
    updateAsset,
    getAssetOpenInfo,
    deleteAsset,
    deleteAssetPermanently,
    restoreAsset,
  };
}

module.exports = {
  createAssetsService,
};
