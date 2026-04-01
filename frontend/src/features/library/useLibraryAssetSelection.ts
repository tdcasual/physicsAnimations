import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import { deleteLibraryAsset, restoreLibraryAsset, updateLibraryAsset } from "./libraryApi";
import type { AssetBatchResult } from "./libraryAdminModels";
import type { LibraryAsset, LibraryOpenMode } from "./types";

type BatchFailure = { id: string; reason: string };

type AssetSelectionDeps = {
  savingAsset: Ref<boolean>;
  selectedFolderId: Ref<string>;
  filteredFolderAssets: ComputedRef<LibraryAsset[]>;
  sortedFilteredFolderAssets: ComputedRef<LibraryAsset[]>;
  reloadFolders: () => Promise<void>;
  reloadFolderAssets: () => Promise<void>;
  setFeedback: (message: string, isError?: boolean) => void;
  getApiErrorCode: (err: unknown) => string;
};

export function useLibraryAssetSelection(deps: AssetSelectionDeps) {
  const selectedAssetIds = ref<string[]>([]);
  const assetBatchMoveFolderId = ref("");
  const assetBatchResult = ref<AssetBatchResult | null>(null);
  const undoAssetIds = ref<string[]>([]);

  const selectedAssetCount = computed(() => selectedAssetIds.value.length);
  const hasSelectedAssets = computed(() => selectedAssetIds.value.length > 0);
  const hasUndoAssets = computed(() => undoAssetIds.value.length > 0);
  const allFilteredAssetsSelected = computed(() => {
    if (deps.filteredFolderAssets.value.length === 0) return false;
    const selected = new Set(selectedAssetIds.value);
    return deps.filteredFolderAssets.value.every((asset) => selected.has(asset.id));
  });

  function setAssetBatchResult(actionLabel: string, successIds: string[], failed: BatchFailure[]) {
    assetBatchResult.value = {
      actionLabel,
      successIds,
      failed,
    };
  }

  function clearSelectedAssets() {
    selectedAssetIds.value = [];
    assetBatchMoveFolderId.value = "";
  }

  function isAssetSelected(assetId: string) {
    return selectedAssetIds.value.includes(assetId);
  }

  function toggleAssetSelection(assetId: string, checked: boolean) {
    const current = new Set(selectedAssetIds.value);
    if (checked) current.add(assetId);
    else current.delete(assetId);
    selectedAssetIds.value = Array.from(current);
  }

  function onAssetSelectChange(assetId: string, event: Event) {
    const target = event.target as HTMLInputElement | null;
    toggleAssetSelection(assetId, !!target?.checked);
  }

  function onSelectAllFilteredAssetsChange(event: Event) {
    const target = event.target as HTMLInputElement | null;
    const checked = !!target?.checked;
    if (!checked) {
      clearSelectedAssets();
      return;
    }
    selectedAssetIds.value = deps.sortedFilteredFolderAssets.value.map((asset) => asset.id);
  }

  async function runAssetBatchOpenMode(mode: LibraryOpenMode) {
    if (selectedAssetIds.value.length === 0) {
      deps.setFeedback("请先选择要批量操作的资源。", true);
      return;
    }
    const targetIds = [...selectedAssetIds.value];
    deps.savingAsset.value = true;
    deps.setFeedback("");
    try {
      const successIds: string[] = [];
      const failed: BatchFailure[] = [];
      for (const assetId of targetIds) {
        try {
          await updateLibraryAsset(assetId, { openMode: mode });
          successIds.push(assetId);
        } catch (err) {
          failed.push({
            id: assetId,
            reason: deps.getApiErrorCode(err),
          });
        }
      }
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      clearSelectedAssets();
      setAssetBatchResult(mode === "embed" ? "批量设为演示" : "批量设为下载", successIds, failed);
      if (failed.length > 0) {
        deps.setFeedback(`批量操作完成：成功 ${successIds.length}，失败 ${failed.length}。`, true);
        return;
      }
      deps.setFeedback(mode === "embed" ? `已批量设为演示（${successIds.length}）。` : `已批量设为下载（${successIds.length}）。`);
    } catch (err) {
      const e = err as { status?: number };
      deps.setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "批量切换失败。", true);
    } finally {
      deps.savingAsset.value = false;
    }
  }

  async function runAssetBatchMove() {
    if (selectedAssetIds.value.length === 0) {
      deps.setFeedback("请先选择要批量移动的资源。", true);
      return;
    }
    if (!assetBatchMoveFolderId.value) {
      deps.setFeedback("请选择目标文件夹。", true);
      return;
    }
    const targetIds = [...selectedAssetIds.value];
    deps.savingAsset.value = true;
    deps.setFeedback("");
    try {
      const successIds: string[] = [];
      const failed: BatchFailure[] = [];
      for (const assetId of targetIds) {
        try {
          await updateLibraryAsset(assetId, { folderId: assetBatchMoveFolderId.value });
          successIds.push(assetId);
        } catch (err) {
          failed.push({
            id: assetId,
            reason: deps.getApiErrorCode(err),
          });
        }
      }
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      clearSelectedAssets();
      setAssetBatchResult("批量移动", successIds, failed);
      if (failed.length > 0) {
        deps.setFeedback(`批量移动完成：成功 ${successIds.length}，失败 ${failed.length}。`, true);
        return;
      }
      deps.setFeedback(`资源已批量移动（${successIds.length}）。`);
    } catch (err) {
      const e = err as { status?: number };
      deps.setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "批量移动失败。", true);
    } finally {
      deps.savingAsset.value = false;
    }
  }

  async function runAssetBatchDelete() {
    if (selectedAssetIds.value.length === 0) {
      deps.setFeedback("请先选择要删除的资源。", true);
      return;
    }
    if (!window.confirm(`确定删除选中的 ${selectedAssetIds.value.length} 个资源吗？`)) return;
    const targetIds = [...selectedAssetIds.value];
    deps.savingAsset.value = true;
    deps.setFeedback("");
    try {
      const successIds: string[] = [];
      const failed: BatchFailure[] = [];
      for (const assetId of targetIds) {
        try {
          await deleteLibraryAsset(assetId);
          successIds.push(assetId);
        } catch (err) {
          failed.push({
            id: assetId,
            reason: deps.getApiErrorCode(err),
          });
        }
      }
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      clearSelectedAssets();
      undoAssetIds.value = successIds;
      setAssetBatchResult("批量删除", successIds, failed);
      if (failed.length > 0) {
        deps.setFeedback(`批量删除完成：成功 ${successIds.length}，失败 ${failed.length}。`, true);
        return;
      }
      deps.setFeedback(`批量删除完成：成功 ${successIds.length}。可点击“撤销最近删除”。`);
    } catch (err) {
      const e = err as { status?: number };
      deps.setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "批量删除失败。", true);
    } finally {
      deps.savingAsset.value = false;
    }
  }

  async function runAssetBatchUndo() {
    if (undoAssetIds.value.length === 0) {
      deps.setFeedback("当前没有可撤销的删除。", true);
      return;
    }
    const targetIds = [...undoAssetIds.value];
    deps.savingAsset.value = true;
    deps.setFeedback("");
    try {
      const successIds: string[] = [];
      const failed: BatchFailure[] = [];
      for (const assetId of targetIds) {
        try {
          await restoreLibraryAsset(assetId);
          successIds.push(assetId);
        } catch (err) {
          failed.push({
            id: assetId,
            reason: deps.getApiErrorCode(err),
          });
        }
      }
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      undoAssetIds.value = failed.map((item) => item.id);
      setAssetBatchResult("撤销删除", successIds, failed);
      if (failed.length > 0) {
        deps.setFeedback(`撤销完成：恢复 ${successIds.length}，失败 ${failed.length}。`, true);
        return;
      }
      deps.setFeedback(`撤销完成：已恢复 ${successIds.length} 个资源。`);
    } catch (err) {
      const e = err as { status?: number };
      deps.setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "撤销删除失败。", true);
    } finally {
      deps.savingAsset.value = false;
    }
  }

  async function removeAsset(assetId: string) {
    if (!window.confirm("确定删除该资源吗？")) return;
    deps.savingAsset.value = true;
    deps.setFeedback("");
    try {
      await deleteLibraryAsset(assetId);
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
      undoAssetIds.value = [assetId];
      setAssetBatchResult("删除资源", [assetId], []);
      deps.setFeedback("资源已删除，可点击“撤销最近删除”。");
    } catch (err) {
      const e = err as { status?: number };
      deps.setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "删除资源失败。", true);
    } finally {
      deps.savingAsset.value = false;
    }
  }

  watch(deps.filteredFolderAssets, (list) => {
    const visible = new Set(list.map((asset) => asset.id));
    selectedAssetIds.value = selectedAssetIds.value.filter((id) => visible.has(id));
  });

  watch(deps.selectedFolderId, () => {
    assetBatchResult.value = null;
    undoAssetIds.value = [];
    clearSelectedAssets();
  });

  return {
    selectedAssetIds,
    assetBatchMoveFolderId,
    assetBatchResult,
    undoAssetIds,
    selectedAssetCount,
    hasSelectedAssets,
    hasUndoAssets,
    allFilteredAssetsSelected,
    clearSelectedAssets,
    isAssetSelected,
    toggleAssetSelection,
    onAssetSelectChange,
    onSelectAllFilteredAssetsChange,
    runAssetBatchOpenMode,
    runAssetBatchMove,
    runAssetBatchDelete,
    runAssetBatchUndo,
    removeAsset,
  };
}
