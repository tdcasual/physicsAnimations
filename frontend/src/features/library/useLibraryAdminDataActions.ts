import type { Ref } from "vue";
import { getLibraryFolder, listLibraryDeletedAssets, listLibraryFolderAssets, listLibraryFolders } from "./libraryApi";
import type { LibraryAsset, LibraryFolder } from "./types";

type LibraryAdminDataActionsDeps = {
  folders: Ref<LibraryFolder[]>;
  selectedFolderId: Ref<string>;
  folderAssets: Ref<LibraryAsset[]>;
  deletedAssets: Ref<LibraryAsset[]>;
  folderAssetsLoadSeq: Ref<number>;
  selectedAssetIds: Ref<string[]>;
  undoAssetIds: Ref<string[]>;
  editingAssetId: Ref<string>;
  clearSelectedAssets: () => void;
  cancelAssetEdit: () => void;
  syncFolderEditDraft: () => void;
  setFeedback: (message: string, isError?: boolean) => void;
};

export function useLibraryAdminDataActions(deps: LibraryAdminDataActionsDeps) {
  async function reloadFolders() {
    const list = await listLibraryFolders();
    deps.folders.value = list;
    if (!deps.selectedFolderId.value && list.length > 0) {
      deps.selectedFolderId.value = list[0].id;
    } else if (deps.selectedFolderId.value && !list.some((folder) => folder.id === deps.selectedFolderId.value)) {
      deps.selectedFolderId.value = list[0]?.id || "";
    }
    deps.syncFolderEditDraft();
  }

  async function reloadFolderAssets() {
    const folderId = deps.selectedFolderId.value;
    const requestId = deps.folderAssetsLoadSeq.value + 1;
    deps.folderAssetsLoadSeq.value = requestId;
    if (!folderId) {
      deps.folderAssets.value = [];
      deps.deletedAssets.value = [];
      deps.cancelAssetEdit();
      deps.clearSelectedAssets();
      return;
    }
    try {
      const [folder, assets, deleted] = await Promise.all([
        getLibraryFolder(folderId),
        listLibraryFolderAssets(folderId),
        listLibraryDeletedAssets(folderId),
      ]);
      if (requestId !== deps.folderAssetsLoadSeq.value || deps.selectedFolderId.value !== folderId) return;
      const idx = deps.folders.value.findIndex((value) => value.id === folder.id);
      if (idx >= 0) {
        const nextCount = Number(folder.assetCount ?? assets.assets.length);
        deps.folders.value[idx] = {
          ...deps.folders.value[idx],
          ...folder,
          assetCount: Number.isFinite(nextCount) ? nextCount : assets.assets.length,
        };
      }
      deps.folderAssets.value = assets.assets;
      deps.deletedAssets.value = deleted.assets;
      const folderAssetIdSet = new Set(assets.assets.map((asset) => asset.id));
      deps.selectedAssetIds.value = deps.selectedAssetIds.value.filter((id) => folderAssetIdSet.has(id));
      const deletedAssetIdSet = new Set(deleted.assets.map((asset) => asset.id));
      deps.undoAssetIds.value = deps.undoAssetIds.value.filter((id) => deletedAssetIdSet.has(id));
      if (deps.editingAssetId.value && !folderAssetIdSet.has(deps.editingAssetId.value)) {
        deps.cancelAssetEdit();
      }
      deps.syncFolderEditDraft();
    } catch (err) {
      if (requestId !== deps.folderAssetsLoadSeq.value || deps.selectedFolderId.value !== folderId) return;
      deps.folderAssets.value = [];
      deps.deletedAssets.value = [];
      deps.clearSelectedAssets();
      deps.cancelAssetEdit();
      deps.syncFolderEditDraft();
      const e = err as { status?: number };
      deps.setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "加载文件夹资源失败。", true);
    }
  }

  return {
    reloadFolders,
    reloadFolderAssets,
  };
}
