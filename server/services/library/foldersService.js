const crypto = require("crypto");
const path = require("path");

const { IMAGE_EXT_BY_MIME, toPublicPath, toStorageKey } = require("./core/normalizers");
const ALLOWED_COVER_EXTS = new Set(IMAGE_EXT_BY_MIME.values());

function createFoldersService({
  store,
  normalizeCategoryId,
  loadLibraryFoldersState,
  mutateLibraryFoldersState,
  loadLibraryAssetsState,
  mutateLibraryAssetsState,
}) {
  async function listFolders() {
    const state = await loadLibraryFoldersState({ store });
    const folders = Array.isArray(state?.folders) ? state.folders : [];
    return folders.slice();
  }

  async function getFolderById({ folderId, withAssetCount = false } = {}) {
    const id = String(folderId || "");
    if (!id) return null;
    const folders = await listFolders();
    const folder = folders.find((item) => item.id === id);
    if (!folder) return null;
    if (!withAssetCount) return folder;

    const assetsState = await loadLibraryAssetsState({ store });
    const assets = Array.isArray(assetsState?.assets) ? assetsState.assets : [];
    let assetCount = 0;
    for (const asset of assets) {
      if (asset.deleted === true) continue;
      if (String(asset.folderId || "") !== id) continue;
      assetCount += 1;
    }

    return {
      ...folder,
      assetCount,
    };
  }

  async function createFolder({ name, categoryId, coverType } = {}) {
    const cleanName = String(name || "").trim();
    if (!cleanName) return { status: 400, error: "invalid_folder_name" };

    const now = new Date().toISOString();
    const folder = {
      id: `f_${crypto.randomUUID()}`,
      name: cleanName,
      categoryId: normalizeCategoryId(categoryId),
      coverType: coverType === "image" ? "image" : "blank",
      coverPath: "",
      parentId: null,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    await mutateLibraryFoldersState({ store }, (state) => {
      state.folders.push(folder);
    });

    return folder;
  }

  async function updateFolder({ folderId, name, categoryId } = {}) {
    const folder = await getFolderById({ folderId });
    if (!folder) return { status: 404, error: "folder_not_found" };

    const nameInputProvided = name !== undefined;
    const categoryInputProvided = categoryId !== undefined;
    const nextName = nameInputProvided ? String(name || "").trim() : folder.name;
    if (nameInputProvided && !nextName) return { status: 400, error: "invalid_folder_name" };
    const nextCategoryId = categoryInputProvided ? normalizeCategoryId(categoryId) : folder.categoryId;
    const now = new Date().toISOString();

    let updatedFolder = null;
    await mutateLibraryFoldersState({ store }, (state) => {
      const target = state.folders.find((item) => item.id === folder.id);
      if (!target) return;
      target.name = nextName;
      target.categoryId = nextCategoryId;
      target.updatedAt = now;
      updatedFolder = { ...target };
    });

    if (!updatedFolder) return { status: 404, error: "folder_not_found" };
    return { ok: true, folder: updatedFolder };
  }

  async function uploadFolderCover({ folderId, fileBuffer, originalName, mimeType }) {
    const folder = await getFolderById({ folderId });
    if (!folder) return { status: 404, error: "folder_not_found" };
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) return { status: 400, error: "missing_file" };

    const mime = String(mimeType || "").toLowerCase();
    if (!mime.startsWith("image/")) return { status: 400, error: "cover_invalid_type" };

    const extByNameRaw = path.extname(String(originalName || "")).toLowerCase();
    const extByName = ALLOWED_COVER_EXTS.has(extByNameRaw) ? extByNameRaw : "";
    const extByMime = IMAGE_EXT_BY_MIME.get(mime) || "";
    const ext = extByMime || extByName;
    if (!ext) return { status: 400, error: "cover_invalid_type" };

    const key = `library/covers/${folder.id}${ext}`;
    const previousCoverKey = toStorageKey(folder.coverPath);
    const previousCoverBuffer = previousCoverKey === key ? await store.readBuffer(key) : null;
    await store.writeBuffer(key, fileBuffer, { contentType: mime || undefined });
    const now = new Date().toISOString();
    const coverPath = toPublicPath(key);

    try {
      await mutateLibraryFoldersState({ store }, (state) => {
        const target = state.folders.find((item) => item.id === folder.id);
        if (!target) return;
        target.coverType = "image";
        target.coverPath = coverPath;
        target.updatedAt = now;
      });
    } catch (err) {
      if (previousCoverBuffer) {
        await store.writeBuffer(key, previousCoverBuffer).catch(() => {});
      } else {
        await store.deletePath(key).catch(() => {});
      }
      throw err;
    }

    if (previousCoverKey && previousCoverKey !== key) {
      await store.deletePath(previousCoverKey).catch(() => {});
    }

    return {
      ok: true,
      coverPath,
    };
  }

  async function deleteFolder({ folderId }) {
    const folder = await getFolderById({ folderId });
    if (!folder) return { status: 404, error: "folder_not_found" };

    const assetsState = await loadLibraryAssetsState({ store });
    const allAssets = Array.isArray(assetsState?.assets) ? assetsState.assets : [];
    const folderAssets = allAssets.filter((asset) => String(asset.folderId || "") === folder.id);
    const aliveAssets = folderAssets.filter((asset) => asset.deleted !== true);
    if (aliveAssets.length > 0) return { status: 409, error: "folder_not_empty" };
    const deletedAssets = folderAssets.filter((asset) => asset.deleted === true);
    if (deletedAssets.length > 0) {
      for (const asset of deletedAssets) {
        try {
          await store.deletePath(`library/assets/${asset.id}`, { recursive: true });
        } catch {
          return { status: 500, error: "folder_asset_cleanup_failed" };
        }
      }
      const deletedSet = new Set(deletedAssets.map((item) => item.id));
      await mutateLibraryAssetsState({ store }, (state) => {
        state.assets = state.assets.filter((item) => !deletedSet.has(item.id));
      });
    }

    if (folder.coverPath) {
      const key = toStorageKey(folder.coverPath);
      if (key) {
        try {
          await store.deletePath(key);
        } catch {
          return { status: 500, error: "folder_cover_cleanup_failed" };
        }
      }
    }

    await mutateLibraryFoldersState({ store }, (state) => {
      state.folders = state.folders.filter((item) => item.id !== folder.id);
    });

    return { ok: true };
  }

  async function getCatalogSummary() {
    const folders = await listFolders();
    const assetsState = await loadLibraryAssetsState({ store });
    const assets = Array.isArray(assetsState?.assets) ? assetsState.assets : [];
    const assetCountByFolder = new Map();
    for (const asset of assets) {
      if (asset.deleted === true) continue;
      const folderId = String(asset.folderId || "");
      assetCountByFolder.set(folderId, (assetCountByFolder.get(folderId) || 0) + 1);
    }

    return folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      categoryId: folder.categoryId,
      coverType: folder.coverType,
      coverPath: folder.coverPath,
      parentId: folder.parentId ?? null,
      order: Number(folder.order || 0),
      assetCount: assetCountByFolder.get(folder.id) || 0,
      updatedAt: folder.updatedAt,
      createdAt: folder.createdAt,
    }));
  }

  return {
    listFolders,
    getFolderById,
    createFolder,
    updateFolder,
    uploadFolderCover,
    deleteFolder,
    getCatalogSummary,
  };
}

module.exports = {
  createFoldersService,
};
