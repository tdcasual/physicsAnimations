import { computed, onMounted, ref, watch } from "vue";
import {
  deleteLibraryAssetPermanently,
  getLibraryFolder,
  listLibraryDeletedAssets,
  listLibraryFolderAssets,
  listLibraryFolders,
  restoreLibraryAsset,
  updateLibraryAsset,
  uploadLibraryAsset,
} from "./libraryApi";
import type { JsonObjectParseResult, LibraryPanelTab } from "./libraryAdminModels";
import { useLibraryAdminFeedback } from "./useLibraryAdminFeedback";
import { useLibraryAssetFilters } from "./useLibraryAssetFilters";
import { useLibraryFolderActions } from "./useLibraryFolderActions";
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
  const activePanelTab = ref<LibraryPanelTab>("folder");
  const folderAssetsLoadSeq = ref(0);
  const panelSections = ref<Record<string, boolean>>({
    "folder:meta": true,
    "folder:cover": true,
    "asset:upload": true,
    "asset:edit": true,
    "embed:create": true,
    "embed:list": true,
    "embed:edit": true,
    "recent:log": true,
  });
  
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
  
  function cancelAssetEdit() {
    editingAssetId.value = "";
    assetEditDisplayName.value = "";
    assetEditFolderId.value = "";
    assetEditOpenMode.value = "embed";
    assetEditParserMode.value = "auto";
    assetEditEmbedProfileId.value = "";
    assetEditEmbedOptionsJson.value = "{}";
    clearFieldErrors("editAssetFolderId", "editAssetEmbedProfile", "editAssetEmbedOptionsJson");
  }
  
  function setActivePanelTab(tab: LibraryPanelTab) {
    activePanelTab.value = tab;
    if (tab === "folder") ensurePanelSectionOpen("folder:meta");
    if (tab === "asset") ensurePanelSectionOpen("asset:upload");
    if (tab === "embed") ensurePanelSectionOpen("embed:create");
  }
  
  function isPanelSectionOpen(key: string) {
    return panelSections.value[key] !== false;
  }
  
  function togglePanelSection(key: string) {
    panelSections.value[key] = !isPanelSectionOpen(key);
  }
  
  function ensurePanelSectionOpen(key: string) {
    panelSections.value[key] = true;
  }

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
  
  function onAssetFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    assetFile.value = target.files?.[0] || null;
    clearFieldErrors("uploadAssetFile");
  }
  
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
  
  async function uploadAssetEntry() {
    clearFieldErrors("uploadAssetFile", "uploadAssetEmbedProfile", "uploadAssetEmbedOptionsJson");
    if (!selectedFolderId.value) {
      setFeedback("请先选择文件夹。", true);
      return;
    }
    if (!assetFile.value) {
      setFieldError("uploadAssetFile", "请选择要上传的资源文件。");
      setFeedback("请选择要上传的资源文件。", true);
      return;
    }
    if (assetParserMode.value === "profile" && !assetEmbedProfileId.value) {
      setFieldError("uploadAssetEmbedProfile", "请选择用于解析的 Embed 平台。");
      setFeedback("请选择用于解析的 Embed 平台。", true);
      return;
    }
  
    let embedOptionsJson = "";
    if (assetParserMode.value === "profile" && assetEmbedOptionsJson.value.trim()) {
      const parsed = parseJsonObjectInput(assetEmbedOptionsJson.value, "Embed 参数 JSON", "uploadAssetEmbedOptionsJson");
      if (!parsed.ok) return;
      embedOptionsJson = JSON.stringify(parsed.value);
    }
  
    savingAsset.value = true;
    setFeedback("");
    try {
      await uploadLibraryAsset({
        folderId: selectedFolderId.value,
        file: assetFile.value,
        openMode: openMode.value,
        displayName: assetDisplayName.value.trim(),
        embedProfileId: assetParserMode.value === "profile" ? assetEmbedProfileId.value : "",
        embedOptionsJson: assetParserMode.value === "profile" ? embedOptionsJson : "",
      });
      assetFile.value = null;
      assetDisplayName.value = "";
      openMode.value = "embed";
      assetEmbedOptionsJson.value = "";
      assetParserMode.value = "auto";
      clearFieldErrors("uploadAssetFile", "uploadAssetEmbedProfile", "uploadAssetEmbedOptionsJson");
      const input = document.querySelector<HTMLInputElement>("#library-asset-file");
      if (input) input.value = "";
      await reloadFolders();
      await reloadFolderAssets();
      setActivePanelTab("asset");
      setFeedback("资源上传成功。");
    } catch (err) {
      const e = err as { status?: number; data?: any };
      if (e?.status === 401) {
        setFeedback("请先登录管理员账号。", true);
        return;
      }
      if (e?.data?.error === "unsupported_asset_type") {
        setFeedback("当前仅支持 .ggb/PhET HTML 自动识别，或选择 Embed 平台进行解析。", true);
        return;
      }
      if (e?.data?.error === "embed_profile_not_found") {
        setFeedback("所选 Embed 平台不存在或已禁用。", true);
        return;
      }
      if (e?.data?.error === "invalid_embed_options_json") {
        setFeedback("Embed 参数 JSON 无效。", true);
        return;
      }
      if (e?.data?.error === "embed_profile_extension_mismatch") {
        setFeedback("该文件扩展名不在 Embed 平台允许列表中。", true);
        return;
      }
      setFeedback("资源上传失败。", true);
    } finally {
      savingAsset.value = false;
    }
  }
  
  async function switchAssetOpenMode(asset: LibraryAsset, mode: LibraryOpenMode) {
    if (asset.openMode === mode) return;
    savingAsset.value = true;
    setFeedback("");
    try {
      await updateLibraryAsset(asset.id, { openMode: mode });
      await reloadFolders();
      await reloadFolderAssets();
      setFeedback(mode === "embed" ? "已切换为演示模式。" : "已切换为仅下载模式。");
    } catch (err) {
      const e = err as { status?: number };
      setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "切换打开方式失败。", true);
    } finally {
      savingAsset.value = false;
    }
  }
  
  async function restoreDeletedAsset(assetId: string) {
    savingAsset.value = true;
    setFeedback("");
    try {
      await restoreLibraryAsset(assetId);
      await reloadFolders();
      await reloadFolderAssets();
      setFeedback("资源已恢复。");
    } catch (err) {
      const e = err as { status?: number };
      setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "恢复资源失败。", true);
    } finally {
      savingAsset.value = false;
    }
  }
  
  async function removeDeletedAssetPermanently(asset: LibraryAsset) {
    const label = asset.displayName || asset.fileName || asset.id;
    if (!window.confirm(`确定永久删除“${label}”吗？该操作不可恢复。`)) return;
    savingAsset.value = true;
    setFeedback("");
    try {
      await deleteLibraryAssetPermanently(asset.id);
      await reloadFolders();
      await reloadFolderAssets();
      setFeedback("资源已永久删除，不可恢复。");
    } catch (err) {
      const e = err as { status?: number; data?: any };
      if (e?.status === 401) {
        setFeedback("请先登录管理员账号。", true);
        return;
      }
      if (e?.data?.error === "asset_not_deleted") {
        setFeedback("请先将资源移入回收站，再执行永久删除。", true);
        return;
      }
      setFeedback("永久删除失败。", true);
    } finally {
      savingAsset.value = false;
    }
  }
  
  function startEditAsset(asset: LibraryAsset) {
    setActivePanelTab("asset");
    ensurePanelSectionOpen("asset:edit");
    editingAssetId.value = asset.id;
    assetEditDisplayName.value = asset.displayName || "";
    assetEditFolderId.value = asset.folderId || selectedFolderId.value;
    assetEditOpenMode.value = asset.openMode;
    if (asset.embedProfileId) {
      assetEditParserMode.value = "profile";
      assetEditEmbedProfileId.value = asset.embedProfileId;
      assetEditEmbedOptionsJson.value = JSON.stringify(asset.embedOptions || {}, null, 2);
    } else {
      assetEditParserMode.value = "auto";
      assetEditEmbedProfileId.value = "";
      assetEditEmbedOptionsJson.value = "{}";
    }
  }
  
  async function saveAssetEdit() {
    clearFieldErrors("editAssetFolderId", "editAssetEmbedProfile", "editAssetEmbedOptionsJson");
    if (!editingAssetId.value) return;
    if (!assetEditFolderId.value) {
      setFieldError("editAssetFolderId", "请选择资源所属文件夹。");
      setFeedback("请选择资源所属文件夹。", true);
      return;
    }
    if (assetEditParserMode.value === "profile" && !assetEditEmbedProfileId.value) {
      setFieldError("editAssetEmbedProfile", "请选择 Embed 平台。");
      setFeedback("请选择 Embed 平台。", true);
      return;
    }
    const parsed = parseJsonObjectInput(
      assetEditParserMode.value === "profile" ? assetEditEmbedOptionsJson.value : "{}",
      "Embed 参数 JSON",
      "editAssetEmbedOptionsJson",
    );
    if (!parsed.ok) return;
  
    savingAsset.value = true;
    setFeedback("");
    try {
      await updateLibraryAsset(editingAssetId.value, {
        displayName: assetEditDisplayName.value.trim(),
        folderId: assetEditFolderId.value,
        openMode: assetEditOpenMode.value,
        embedProfileId: assetEditParserMode.value === "profile" ? assetEditEmbedProfileId.value : "",
        embedOptions: assetEditParserMode.value === "profile" ? parsed.value : {},
      });
      const previousFolderId = selectedFolderId.value;
      await reloadFolders();
      if (previousFolderId) selectedFolderId.value = previousFolderId;
      await reloadFolderAssets();
      setActivePanelTab("asset");
      setFeedback("资源已更新。");
      cancelAssetEdit();
    } catch (err) {
      const e = err as { status?: number; data?: any };
      if (e?.status === 401) {
        setFeedback("请先登录管理员账号。", true);
        return;
      }
      if (e?.data?.error === "embed_profile_not_found") {
        setFeedback("所选 Embed 平台不存在或已禁用。", true);
        return;
      }
      if (e?.data?.error === "embed_profile_extension_mismatch") {
        setFeedback("资源扩展名不在目标 Embed 平台支持范围内。", true);
        return;
      }
      if (e?.data?.error === "unsupported_asset_type") {
        setFeedback("当前资源无法切换到自动适配，请保持 Embed 平台模式。", true);
        return;
      }
      setFeedback("更新资源失败。", true);
    } finally {
      savingAsset.value = false;
    }
  }
  
  async function renameAssetDisplayName(asset: LibraryAsset) {
    const current = asset.displayName || asset.fileName || "";
    const next = window.prompt("请输入新的显示名称（留空则恢复文件名显示）", current);
    if (next === null) return;
    savingAsset.value = true;
    setFeedback("");
    try {
      await updateLibraryAsset(asset.id, { displayName: next.trim() });
      await reloadFolders();
      await reloadFolderAssets();
      setFeedback("显示名称已更新。");
    } catch (err) {
      const e = err as { status?: number };
      setFeedback(e?.status === 401 ? "请先登录管理员账号。" : "更新显示名称失败。", true);
    } finally {
      savingAsset.value = false;
    }
  }
  
  watch(selectedFolderId, () => {
    syncFolderEditDraft();
    void reloadFolderAssets().catch(() => {});
  });
  
  watch(assetParserMode, (mode) => {
    if (mode !== "profile") {
      assetEmbedProfileId.value = "";
      assetEmbedOptionsJson.value = "";
      clearFieldErrors("uploadAssetEmbedProfile", "uploadAssetEmbedOptionsJson");
      return;
    }
    if (!assetEmbedProfileId.value) {
      assetEmbedProfileId.value = selectableEmbedProfiles.value[0]?.id || "";
    }
  });
  
  watch(assetEditParserMode, (mode) => {
    if (mode !== "profile") {
      assetEditEmbedProfileId.value = "";
      assetEditEmbedOptionsJson.value = "{}";
      clearFieldErrors("editAssetEmbedProfile", "editAssetEmbedOptionsJson");
      return;
    }
    if (!assetEditEmbedProfileId.value) {
      assetEditEmbedProfileId.value = selectableEmbedProfiles.value[0]?.id || "";
    }
  });
  
  onMounted(async () => {
    loading.value = true;
    setFeedback("");
    try {
      await reloadTaxonomy().catch(() => {});
      await reloadEmbedProfiles().catch(() => {});
      await reloadFolders();
      await reloadFolderAssets();
    } catch {
      setFeedback("加载资源库管理数据失败。", true);
    } finally {
      loading.value = false;
    }
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
