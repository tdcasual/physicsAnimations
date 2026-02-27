const crypto = require("crypto");
const path = require("path");

const {
  loadLibraryFoldersState: defaultLoadLibraryFoldersState,
  mutateLibraryFoldersState: defaultMutateLibraryFoldersState,
  loadLibraryAssetsState: defaultLoadLibraryAssetsState,
  mutateLibraryAssetsState: defaultMutateLibraryAssetsState,
} = require("../../lib/libraryState");
const { normalizeCategoryId } = require("../items/itemModel");
const { createDefaultLibraryAdapterRegistry } = require("./adapters");

const IMAGE_EXT_BY_MIME = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/svg+xml", ".svg"],
]);

function normalizeOpenMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "embed") return "embed";
  if (mode === "download") return "download";
  return "";
}

function sanitizeFileName(name, fallback = "asset.bin") {
  const base = path.basename(String(name || "").trim());
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe || fallback;
}

function toPublicPath(key) {
  const normalized = String(key || "").replace(/^\/+/, "");
  return `content/${normalized}`;
}

function toStorageKey(publicPath) {
  return String(publicPath || "")
    .replace(/^\/+/, "")
    .replace(/^content\//, "");
}

function createLibraryService({ store, deps = {} }) {
  if (!store || typeof store.readBuffer !== "function" || typeof store.writeBuffer !== "function") {
    throw new TypeError("createLibraryService requires a valid store");
  }

  const loadLibraryFoldersState = deps.loadLibraryFoldersState || defaultLoadLibraryFoldersState;
  const mutateLibraryFoldersState = deps.mutateLibraryFoldersState || defaultMutateLibraryFoldersState;
  const loadLibraryAssetsState = deps.loadLibraryAssetsState || defaultLoadLibraryAssetsState;
  const mutateLibraryAssetsState = deps.mutateLibraryAssetsState || defaultMutateLibraryAssetsState;
  const adapterRegistry = deps.adapterRegistry || createDefaultLibraryAdapterRegistry();

  async function listFolders() {
    const state = await loadLibraryFoldersState({ store });
    const folders = Array.isArray(state?.folders) ? state.folders : [];
    return folders.slice();
  }

  async function getFolderById({ folderId }) {
    const id = String(folderId || "");
    if (!id) return null;
    const folders = await listFolders();
    return folders.find((folder) => folder.id === id) || null;
  }

  async function createFolder({ name, categoryId, coverType } = {}) {
    const now = new Date().toISOString();
    const folder = {
      id: `f_${crypto.randomUUID()}`,
      name: String(name || "").trim(),
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

  async function uploadFolderCover({ folderId, fileBuffer, originalName, mimeType }) {
    const folder = await getFolderById({ folderId });
    if (!folder) return { status: 404, error: "folder_not_found" };
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) return { status: 400, error: "missing_file" };

    const mime = String(mimeType || "").toLowerCase();
    if (!mime.startsWith("image/")) return { status: 400, error: "cover_invalid_type" };

    const extByName = path.extname(String(originalName || "")).toLowerCase();
    const ext = extByName || IMAGE_EXT_BY_MIME.get(mime) || "";
    if (!ext) return { status: 400, error: "cover_invalid_type" };

    const key = `library/covers/${folder.id}${ext}`;
    await store.writeBuffer(key, fileBuffer, { contentType: mime || undefined });
    const now = new Date().toISOString();
    const coverPath = toPublicPath(key);

    await mutateLibraryFoldersState({ store }, (state) => {
      const target = state.folders.find((item) => item.id === folder.id);
      if (!target) return;
      target.coverType = "image";
      target.coverPath = coverPath;
      target.updatedAt = now;
    });

    return {
      ok: true,
      coverPath,
    };
  }

  async function listFolderAssets({ folderId }) {
    const id = String(folderId || "");
    const state = await loadLibraryAssetsState({ store });
    const all = Array.isArray(state?.assets) ? state.assets : [];
    return all.filter((item) => item.folderId === id);
  }

  async function getAssetById({ assetId }) {
    const id = String(assetId || "");
    if (!id) return null;
    const state = await loadLibraryAssetsState({ store });
    const all = Array.isArray(state?.assets) ? state.assets : [];
    return all.find((item) => item.id === id) || null;
  }

  async function uploadAsset({ folderId, fileBuffer, originalName, openMode }) {
    const folder = await getFolderById({ folderId });
    if (!folder) return { status: 404, error: "folder_not_found" };
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) return { status: 400, error: "missing_file" };

    const mode = normalizeOpenMode(openMode);
    if (!mode) return { status: 400, error: "invalid_open_mode" };

    const safeName = sanitizeFileName(originalName, "asset.ggb");
    const adapter = adapterRegistry.findForFile({ fileName: safeName, fileBuffer });
    if (!adapter) return { status: 400, error: "unsupported_asset_type" };

    const now = new Date().toISOString();
    const assetId = `a_${crypto.randomUUID()}`;
    const sourceKey = `library/assets/${assetId}/source/${safeName}`;
    const sourcePublicPath = toPublicPath(sourceKey);
    let generatedEntryPath = "";

    await store.writeBuffer(sourceKey, fileBuffer, { contentType: "application/octet-stream" });

    if (mode === "embed") {
      try {
        const viewer = await adapter.buildViewer({
          openMode: mode,
          assetPublicFileUrl: `/${sourcePublicPath}`,
          title: safeName,
        });
        if (!viewer || viewer.generated !== true || typeof viewer.html !== "string" || !viewer.html.trim()) {
          return { status: 500, error: "adapter_render_failed" };
        }
        const viewerKey = `library/assets/${assetId}/viewer/index.html`;
        await store.writeBuffer(viewerKey, Buffer.from(viewer.html, "utf8"), {
          contentType: "text/html; charset=utf-8",
        });
        generatedEntryPath = toPublicPath(viewerKey);
      } catch {
        await store.deletePath(`library/assets/${assetId}`, { recursive: true }).catch(() => {});
        return { status: 500, error: "adapter_render_failed" };
      }
    }

    const asset = {
      id: assetId,
      folderId: folder.id,
      adapterKey: adapter.key,
      fileName: safeName,
      filePath: sourcePublicPath,
      fileSize: fileBuffer.length,
      openMode: mode,
      generatedEntryPath,
      status: "ready",
      createdAt: now,
      updatedAt: now,
    };

    await mutateLibraryAssetsState({ store }, (state) => {
      state.assets.push(asset);
    });

    return { ok: true, asset };
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
    const asset = await getAssetById({ assetId });
    if (!asset) return { status: 404, error: "asset_not_found" };

    await mutateLibraryAssetsState({ store }, (state) => {
      state.assets = state.assets.filter((item) => item.id !== asset.id);
    });

    await store.deletePath(`library/assets/${asset.id}`, { recursive: true }).catch(() => {});
    return { ok: true };
  }

  async function deleteFolder({ folderId }) {
    const folder = await getFolderById({ folderId });
    if (!folder) return { status: 404, error: "folder_not_found" };

    const assets = await listFolderAssets({ folderId: folder.id });
    if (assets.length > 0) return { status: 409, error: "folder_not_empty" };

    await mutateLibraryFoldersState({ store }, (state) => {
      state.folders = state.folders.filter((item) => item.id !== folder.id);
    });

    if (folder.coverPath) {
      const key = toStorageKey(folder.coverPath);
      if (key) await store.deletePath(key).catch(() => {});
    }

    return { ok: true };
  }

  async function getCatalogSummary() {
    const folders = await listFolders();
    const assetsState = await loadLibraryAssetsState({ store });
    const assets = Array.isArray(assetsState?.assets) ? assetsState.assets : [];
    const assetCountByFolder = new Map();
    for (const asset of assets) {
      const folderId = String(asset.folderId || "");
      assetCountByFolder.set(folderId, (assetCountByFolder.get(folderId) || 0) + 1);
    }

    return folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      categoryId: folder.categoryId,
      coverType: folder.coverType,
      coverPath: folder.coverPath,
      assetCount: assetCountByFolder.get(folder.id) || 0,
      updatedAt: folder.updatedAt,
      createdAt: folder.createdAt,
    }));
  }

  return {
    createFolder,
    listFolders,
    getFolderById,
    uploadFolderCover,
    uploadAsset,
    listFolderAssets,
    getAssetById,
    getAssetOpenInfo,
    getCatalogSummary,
    deleteFolder,
    deleteAsset,
  };
}

module.exports = {
  createLibraryService,
};
