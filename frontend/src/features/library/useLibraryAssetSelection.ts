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

export function useLibraryAssetSelection(_deps: AssetSelectionDeps) {
  const selectedAssetIds = ref<string[]>([]);
  const assetBatchMoveFolderId = ref("");
  const assetBatchResult = ref<AssetBatchResult | null>(null);
  const undoAssetIds = ref<string[]>([]);

  const selectedAssetCount = computed(() => selectedAssetIds.value.length);
  const hasSelectedAssets = computed(() => selectedAssetIds.value.length > 0);
  const hasUndoAssets = computed(() => undoAssetIds.value.length > 0);
  const allFilteredAssetsSelected = computed(() => false);

  function clearSelectedAssets() {
    selectedAssetIds.value = [];
    assetBatchMoveFolderId.value = "";
  }

  function isAssetSelected(assetId: string) {
    return selectedAssetIds.value.includes(assetId);
  }

  function toggleAssetSelection(assetId: string, checked: boolean) {
    if (checked && !selectedAssetIds.value.includes(assetId)) {
      selectedAssetIds.value = [...selectedAssetIds.value, assetId];
      return;
    }
    if (!checked) selectedAssetIds.value = selectedAssetIds.value.filter((id) => id !== assetId);
  }

  function onAssetSelectChange(assetId: string, event: Event) {
    const target = event.target as HTMLInputElement | null;
    toggleAssetSelection(assetId, !!target?.checked);
  }

  function onSelectAllFilteredAssetsChange(_event: Event) {
    clearSelectedAssets();
  }

  async function runAssetBatchOpenMode(_mode: LibraryOpenMode) {
    return;
  }

  async function runAssetBatchMove() {
    return;
  }

  async function runAssetBatchDelete() {
    return;
  }

  async function runAssetBatchUndo() {
    return;
  }

  async function removeAsset(_assetId: string) {
    return;
  }

  watch(selectedAssetIds, () => {});

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
