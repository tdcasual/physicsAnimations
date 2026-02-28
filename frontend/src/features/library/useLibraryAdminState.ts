import { computed, ref, watch } from "vue";
import {
  getLibraryFolder,
  listLibraryDeletedAssets,
  listLibraryFolderAssets,
  listLibraryFolders,
} from "./libraryApi";
import type { JsonObjectParseResult } from "./libraryAdminModels";
import { useLibraryAdminFeedback } from "./useLibraryAdminFeedback";
import { useLibraryAssetCrudActions } from "./useLibraryAssetCrudActions";
import { useLibraryAssetEditorActions } from "./useLibraryAssetEditorActions";
import { useLibraryAssetFilters } from "./useLibraryAssetFilters";
import { useLibraryAdminLifecycle } from "./useLibraryAdminLifecycle";
import { useLibraryFolderActions } from "./useLibraryFolderActions";
import { useLibraryPanelSections } from "./useLibraryPanelSections";
import { useLibraryAssetSelection } from "./useLibraryAssetSelection";
import { useLibraryEmbedProfileActions } from "./useLibraryEmbedProfileActions";
import type { LibraryAsset, LibraryEmbedProfile, LibraryFolder, LibraryOpenMode } from "./types";
export function useLibraryAdminState() {
  const loading = ref(false);
  const savingFolder = ref(false);
  const savingAsset = ref(false);
  const savingEmbed = ref(false);
  const saving = computed(() => savingFolder.value || savingAsset.value || savingEmbed.value);
  const {
    feedback,
    feedbackError,
    fieldErrors,
    operationLogs,
    operationLogFilter,
    filteredOperationLogs,
    setFeedback,
    setFieldError,
    clearFieldErrors,
    getFieldError,
    formatOperationTime,
    pushOperationLog,
    clearOperationLogs,
    getApiErrorCode,
  } = useLibraryAdminFeedback();
  const folders = ref<LibraryFolder[]>([]);
  const selectedFolderId = ref("");
  const folderAssets = ref<LibraryAsset[]>([]);
  const deletedAssets = ref<LibraryAsset[]>([]);
  const embedProfiles = ref<LibraryEmbedProfile[]>([]);
  const assetFile = ref<File | null>(null);
  const assetDisplayName = ref("");
  const openMode = ref<LibraryOpenMode>("embed");
  const assetParserMode = ref<"auto" | "profile">("auto");
  const assetEmbedProfileId = ref("");
  const assetEmbedOptionsJson = ref("");
  const editingAssetId = ref("");
  const assetEditDisplayName = ref("");
  const assetEditFolderId = ref("");
  const assetEditOpenMode = ref<LibraryOpenMode>("embed");
  const assetEditParserMode = ref<"auto" | "profile">("auto");
  const assetEditEmbedProfileId = ref("");
  const assetEditEmbedOptionsJson = ref("{}");
  const embedProfileName = ref("");
  const embedScriptUrl = ref("");
  const embedFallbackScriptUrl = ref("");
  const embedViewerPath = ref("");
  const embedConstructorName = ref("ElectricFieldApp");
  const embedAssetUrlOptionKey = ref("sceneUrl");
  const embedExtensionsText = ref("");
  const embedDefaultOptionsJson = ref("{}");
  const embedEnabled = ref(true);
  const editingEmbedProfileId = ref("");
  const embedEditName = ref("");
  const embedEditScriptUrl = ref("");
  const embedEditFallbackScriptUrl = ref("");
  const embedEditViewerPath = ref("");
  const embedEditConstructorName = ref("ElectricFieldApp");
  const embedEditAssetUrlOptionKey = ref("sceneUrl");
  const embedEditExtensionsText = ref("");
  const embedEditDefaultOptionsJson = ref("{}");
  const embedEditEnabled = ref(true);
  const folderAssetsLoadSeq = ref(0);
  const selectedFolder = computed(() => folders.value.find((folder) => folder.id === selectedFolderId.value) || null);
  const editingAsset = computed(() => folderAssets.value.find((asset) => asset.id === editingAssetId.value) || null);
  const assetFilters = useLibraryAssetFilters({
    folders,
    folderAssets,
    embedProfiles,
    selectedFolder,
  });
  const {
    folderSearchQuery,
    assetSearchQuery,
    profileSearchQuery,
    assetModeFilter,
    assetEmbedProfileFilter,
    assetSortMode,
    selectableEmbedProfiles,
    selectedFolderAssetCount,
    filteredFolders,
    filteredFolderAssets,
    sortedFilteredFolderAssets,
    filteredEmbedProfiles,
  } = assetFilters;

  const assetSelection = useLibraryAssetSelection({
    savingAsset,
    selectedFolderId,
    filteredFolderAssets,
    sortedFilteredFolderAssets,
    reloadFolders,
    reloadFolderAssets,
    setFeedback,
    getApiErrorCode,
  });

  const {
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
  } = assetSelection;
  
  function parseJsonObjectInput(
    raw: string,
    fieldLabel: string,
    fieldKey = "",
  ): JsonObjectParseResult {
    const text = String(raw || "").trim();
    if (!text) return { ok: true, value: {} };
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        if (fieldKey) setFieldError(fieldKey, `${fieldLabel} 需要是对象。`);
        setFeedback(`${fieldLabel} 需要是对象。`, true);
        return { ok: false };
      }
      return { ok: true, value: parsed as Record<string, unknown> };
    } catch {
      if (fieldKey) setFieldError(fieldKey, `${fieldLabel} 格式错误。`);
      setFeedback(`${fieldLabel} 格式错误。`, true);
      return { ok: false };
    }
  }

  const {
    activePanelTab,
    panelSections,
    isPanelSectionOpen,
    togglePanelSection,
    ensurePanelSectionOpen,
    setActivePanelTab,
  } = useLibraryPanelSections();

  const {
    cancelEmbedProfileEdit,
    reloadEmbedProfiles,
    createEmbedProfileEntry,
    startEditEmbedProfile,
    saveEmbedProfileEdit,
    removeEmbedProfile,
    syncEmbedProfileEntry,
  } = useLibraryEmbedProfileActions({
    savingEmbed,
    embedProfiles,
    assetEmbedProfileId,
    assetEditParserMode,
    assetEditEmbedProfileId,
    embedProfileName,
    embedScriptUrl,
    embedFallbackScriptUrl,
    embedViewerPath,
    embedConstructorName,
    embedAssetUrlOptionKey,
    embedExtensionsText,
    embedDefaultOptionsJson,
    embedEnabled,
    editingEmbedProfileId,
    embedEditName,
    embedEditScriptUrl,
    embedEditFallbackScriptUrl,
    embedEditViewerPath,
    embedEditConstructorName,
    embedEditAssetUrlOptionKey,
    embedEditExtensionsText,
    embedEditDefaultOptionsJson,
    embedEditEnabled,
    setFeedback,
    setFieldError,
    clearFieldErrors,
    setActivePanelTab,
    ensurePanelSectionOpen,
    parseJsonObjectInput,
  });
  
  async function reloadFolders() {
    const list = await listLibraryFolders();
    folders.value = list;
    if (!selectedFolderId.value && list.length > 0) {
      selectedFolderId.value = list[0].id;
    } else if (selectedFolderId.value && !list.some((folder) => folder.id === selectedFolderId.value)) {
      selectedFolderId.value = list[0]?.id || "";
    }
    syncFolderEditDraft();
  }
  
  async function reloadFolderAssets() {
    const folderId = selectedFolderId.value;
    const requestId = folderAssetsLoadSeq.value + 1;
    folderAssetsLoadSeq.value = requestId;
    if (!folderId) {
      folderAssets.value = [];
      deletedAssets.value = [];
      cancelAssetEdit();
      clearSelectedAssets();
      return;
    }
    try {
      const [folder, assets, deleted] = await Promise.all([
        getLibraryFolder(folderId),
        listLibraryFolderAssets(folderId),
        listLibraryDeletedAssets(folderId),
      ]);
      if (requestId !== folderAssetsLoadSeq.value || selectedFolderId.value !== folderId) return;
      const idx = folders.value.findIndex((value) => value.id === folder.id);
      if (idx >= 0) {
        const nextCount = Number(folder.assetCount ?? assets.assets.length);
        folders.value[idx] = {
          ...folders.value[idx],
          ...folder,
          assetCount: Number.isFinite(nextCount) ? nextCount : assets.assets.length,
        };
      }
      folderAssets.value = assets.assets;
      deletedAssets.value = deleted.assets;
      const idSet = new Set(assets.assets.map((asset) => asset.id));
      selectedAssetIds.value = selectedAssetIds.value.filter((id) => idSet.has(id));
      undoAssetIds.value = undoAssetIds.value.filter((id) => deleted.assets.some((asset) => asset.id === id));
      if (editingAssetId.value && !assets.assets.some((asset) => asset.id === editingAssetId.value)) {
        cancelAssetEdit();
      }
      syncFolderEditDraft();
    } catch (err) {
      if (requestId !== folderAssetsLoadSeq.value || selectedFolderId.value !== folderId) return;
      folderAssets.value = [];
      deletedAssets.value = [];
      clearSelectedAssets();
      cancelAssetEdit();
      syncFolderEditDraft();
      const e = err as { status?: number };
      setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "加载文件夹资源失败。", true);
    }
  }

  const {
    categories,
    groups,
    folderName,
    folderCategoryId,
    createCoverFile,
    folderEditName,
    folderEditCategoryId,
    coverFile,
    groupedCategoryOptions,
    syncFolderEditDraft,
    syncCategorySelection,
    syncFolderEditCategorySelection,
    reloadTaxonomy,
    onCreateCoverFileChange,
    onCoverFileChange,
    createFolderEntry,
    saveFolderMeta,
    uploadCover,
    removeFolder,
  } = useLibraryFolderActions({
    savingFolder,
    selectedFolderId,
    selectedFolder,
    reloadFolders,
    reloadFolderAssets,
    setActivePanelTab,
    setFeedback,
    setFieldError,
    clearFieldErrors,
  });

  const {
    onAssetFileChange,
    uploadAssetEntry,
    switchAssetOpenMode,
    restoreDeletedAsset,
    removeDeletedAssetPermanently,
  } = useLibraryAssetCrudActions({
    savingAsset,
    selectedFolderId,
    assetFile,
    assetDisplayName,
    openMode,
    assetParserMode,
    assetEmbedProfileId,
    assetEmbedOptionsJson,
    reloadFolders,
    reloadFolderAssets,
    setActivePanelTab,
    setFeedback,
    setFieldError,
    clearFieldErrors,
    parseJsonObjectInput,
  });

  const { cancelAssetEdit, startEditAsset, saveAssetEdit, renameAssetDisplayName } = useLibraryAssetEditorActions({
    savingAsset,
    selectedFolderId,
    editingAssetId,
    assetEditDisplayName,
    assetEditFolderId,
    assetEditOpenMode,
    assetEditParserMode,
    assetEditEmbedProfileId,
    assetEditEmbedOptionsJson,
    reloadFolders,
    reloadFolderAssets,
    setActivePanelTab,
    ensurePanelSectionOpen,
    setFeedback,
    setFieldError,
    clearFieldErrors,
    parseJsonObjectInput,
  });
  
  watch(selectedFolderId, () => {
    syncFolderEditDraft();
    void reloadFolderAssets().catch(() => {});
  });

  useLibraryAdminLifecycle({
    loading,
    assetParserMode,
    assetEmbedProfileId,
    assetEmbedOptionsJson,
    assetEditParserMode,
    assetEditEmbedProfileId,
    assetEditEmbedOptionsJson,
    selectableEmbedProfiles,
    clearFieldErrors,
    reloadTaxonomy,
    reloadEmbedProfiles,
    reloadFolders,
    reloadFolderAssets,
    setFeedback,
  });

  return {
    loading,
    savingFolder,
    savingAsset,
    savingEmbed,
    saving,
    feedback,
    feedbackError,
    fieldErrors,
    folders,
    selectedFolderId,
    folderAssets,
    deletedAssets,
    embedProfiles,
    categories,
    groups,
    folderName,
    folderCategoryId,
    createCoverFile,
    folderEditName,
    folderEditCategoryId,
    coverFile,
    assetFile,
    assetDisplayName,
    openMode,
    assetParserMode,
    assetEmbedProfileId,
    assetEmbedOptionsJson,
    editingAssetId,
    assetEditDisplayName,
    assetEditFolderId,
    assetEditOpenMode,
    assetEditParserMode,
    assetEditEmbedProfileId,
    assetEditEmbedOptionsJson,
    embedProfileName,
    embedScriptUrl,
    embedFallbackScriptUrl,
    embedViewerPath,
    embedConstructorName,
    embedAssetUrlOptionKey,
    embedExtensionsText,
    embedDefaultOptionsJson,
    embedEnabled,
    editingEmbedProfileId,
    embedEditName,
    embedEditScriptUrl,
    embedEditFallbackScriptUrl,
    embedEditViewerPath,
    embedEditConstructorName,
    embedEditAssetUrlOptionKey,
    embedEditExtensionsText,
    embedEditDefaultOptionsJson,
    embedEditEnabled,
    activePanelTab,
    folderSearchQuery,
    assetSearchQuery,
    profileSearchQuery,
    assetModeFilter,
    assetEmbedProfileFilter,
    assetSortMode,
    assetBatchMoveFolderId,
    selectedAssetIds,
    assetBatchResult,
    undoAssetIds,
    operationLogs,
    operationLogFilter,
    folderAssetsLoadSeq,
    panelSections,
    selectedFolder,
    groupedCategoryOptions,
    selectableEmbedProfiles,
    editingAsset,
    selectedFolderAssetCount,
    filteredFolders,
    filteredFolderAssets,
    sortedFilteredFolderAssets,
    filteredEmbedProfiles,
    selectedAssetCount,
    hasSelectedAssets,
    hasUndoAssets,
    filteredOperationLogs,
    allFilteredAssetsSelected,
    parseJsonObjectInput,
    syncFolderEditDraft,
    cancelAssetEdit,
    clearSelectedAssets,
    isAssetSelected,
    toggleAssetSelection,
    onAssetSelectChange,
    onSelectAllFilteredAssetsChange,
    cancelEmbedProfileEdit,
    setFeedback,
    setFieldError,
    clearFieldErrors,
    getFieldError,
    setActivePanelTab,
    isPanelSectionOpen,
    togglePanelSection,
    ensurePanelSectionOpen,
    formatOperationTime,
    pushOperationLog,
    clearOperationLogs,
    getApiErrorCode,
    onCreateCoverFileChange,
    onCoverFileChange,
    onAssetFileChange,
    reloadFolders,
    syncCategorySelection,
    syncFolderEditCategorySelection,
    reloadTaxonomy,
    reloadFolderAssets,
    reloadEmbedProfiles,
    createFolderEntry,
    saveFolderMeta,
    uploadCover,
    uploadAssetEntry,
    switchAssetOpenMode,
    runAssetBatchOpenMode,
    runAssetBatchMove,
    runAssetBatchDelete,
    runAssetBatchUndo,
    restoreDeletedAsset,
    removeDeletedAssetPermanently,
    startEditAsset,
    saveAssetEdit,
    createEmbedProfileEntry,
    startEditEmbedProfile,
    saveEmbedProfileEdit,
    removeEmbedProfile,
    syncEmbedProfileEntry,
    renameAssetDisplayName,
    removeAsset,
    removeFolder,
  };
}
