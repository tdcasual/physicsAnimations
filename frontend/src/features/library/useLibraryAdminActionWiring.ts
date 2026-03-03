import { watch, type Ref } from "vue";
import { useLibraryAssetCrudActions } from "./useLibraryAssetCrudActions";
import { useLibraryAssetEditorActions } from "./useLibraryAssetEditorActions";
import { useLibraryAdminLifecycle } from "./useLibraryAdminLifecycle";
import { useLibraryFolderActions } from "./useLibraryFolderActions";
import { useLibraryAssetSelection } from "./useLibraryAssetSelection";
import { useLibraryEmbedProfileActions } from "./useLibraryEmbedProfileActions";
import { useLibraryAdminDataActions } from "./useLibraryAdminDataActions";
import type { createJsonObjectInputParser } from "./createJsonObjectInputParser";
import type { useLibraryAdminDraftState } from "./useLibraryAdminDraftState";
import type { useLibraryAdminFeedback } from "./useLibraryAdminFeedback";
import type { useLibraryAssetFilters } from "./useLibraryAssetFilters";
import type { useLibraryPanelSections } from "./useLibraryPanelSections";

type LibraryAdminDraftState = ReturnType<typeof useLibraryAdminDraftState>;
type LibraryAdminFeedbackState = ReturnType<typeof useLibraryAdminFeedback>;
type LibraryAssetFiltersState = ReturnType<typeof useLibraryAssetFilters>;
type LibraryPanelSectionsState = ReturnType<typeof useLibraryPanelSections>;
type ParseJsonObjectInput = ReturnType<typeof createJsonObjectInputParser>;

type UseLibraryAdminActionWiringParams = {
  loading: Ref<boolean>;
  savingFolder: Ref<boolean>;
  savingAsset: Ref<boolean>;
  savingEmbed: Ref<boolean>;
  feedback: LibraryAdminFeedbackState;
  draft: LibraryAdminDraftState;
  filters: LibraryAssetFiltersState;
  panels: LibraryPanelSectionsState;
  parseJsonObjectInput: ParseJsonObjectInput;
};

export function useLibraryAdminActionWiring(params: UseLibraryAdminActionWiringParams) {
  const {
    loading,
    savingFolder,
    savingAsset,
    savingEmbed,
    feedback,
    draft,
    filters,
    panels,
    parseJsonObjectInput,
  } = params;
  const {
    setFeedback,
    setFieldError,
    clearFieldErrors,
    getApiErrorCode,
  } = feedback;
  const {
    setActivePanelTab,
    ensurePanelSectionOpen,
  } = panels;

  let reloadFolders: () => Promise<void> = async () => {};
  let reloadFolderAssets: () => Promise<void> = async () => {};
  let syncFolderEditDraft = () => {};
  let cancelAssetEdit = () => {};

  const assetSelection = useLibraryAssetSelection({
    savingAsset,
    selectedFolderId: draft.selectedFolderId,
    filteredFolderAssets: filters.filteredFolderAssets,
    sortedFilteredFolderAssets: filters.sortedFilteredFolderAssets,
    reloadFolders: () => reloadFolders(),
    reloadFolderAssets: () => reloadFolderAssets(),
    setFeedback,
    getApiErrorCode,
  });

  const embedActions = useLibraryEmbedProfileActions({
    savingEmbed,
    embedProfiles: draft.embedProfiles,
    assetEmbedProfileId: draft.assetEmbedProfileId,
    assetEditParserMode: draft.assetEditParserMode,
    assetEditEmbedProfileId: draft.assetEditEmbedProfileId,
    embedProfileName: draft.embedProfileName,
    embedScriptUrl: draft.embedScriptUrl,
    embedFallbackScriptUrl: draft.embedFallbackScriptUrl,
    embedViewerPath: draft.embedViewerPath,
    embedConstructorName: draft.embedConstructorName,
    embedAssetUrlOptionKey: draft.embedAssetUrlOptionKey,
    embedExtensionsText: draft.embedExtensionsText,
    embedDefaultOptionsJson: draft.embedDefaultOptionsJson,
    embedEnabled: draft.embedEnabled,
    editingEmbedProfileId: draft.editingEmbedProfileId,
    embedEditName: draft.embedEditName,
    embedEditScriptUrl: draft.embedEditScriptUrl,
    embedEditFallbackScriptUrl: draft.embedEditFallbackScriptUrl,
    embedEditViewerPath: draft.embedEditViewerPath,
    embedEditConstructorName: draft.embedEditConstructorName,
    embedEditAssetUrlOptionKey: draft.embedEditAssetUrlOptionKey,
    embedEditExtensionsText: draft.embedEditExtensionsText,
    embedEditDefaultOptionsJson: draft.embedEditDefaultOptionsJson,
    embedEditEnabled: draft.embedEditEnabled,
    setFeedback,
    setFieldError,
    clearFieldErrors,
    setActivePanelTab,
    ensurePanelSectionOpen,
    parseJsonObjectInput,
  });

  const dataActions = useLibraryAdminDataActions({
    folders: draft.folders,
    selectedFolderId: draft.selectedFolderId,
    folderAssets: draft.folderAssets,
    deletedAssets: draft.deletedAssets,
    folderListLoadSeq: draft.folderListLoadSeq,
    folderAssetsLoadSeq: draft.folderAssetsLoadSeq,
    selectedAssetIds: assetSelection.selectedAssetIds,
    undoAssetIds: assetSelection.undoAssetIds,
    editingAssetId: draft.editingAssetId,
    clearSelectedAssets: assetSelection.clearSelectedAssets,
    cancelAssetEdit: () => cancelAssetEdit(),
    syncFolderEditDraft: () => syncFolderEditDraft(),
    setFeedback,
  });
  reloadFolders = dataActions.reloadFolders;
  reloadFolderAssets = dataActions.reloadFolderAssets;

  const folderActions = useLibraryFolderActions({
    savingFolder,
    selectedFolderId: draft.selectedFolderId,
    selectedFolder: draft.selectedFolder,
    reloadFolders,
    reloadFolderAssets,
    setActivePanelTab,
    setFeedback,
    setFieldError,
    clearFieldErrors,
  });
  syncFolderEditDraft = folderActions.syncFolderEditDraft;

  const assetCrudActions = useLibraryAssetCrudActions({
    savingAsset,
    selectedFolderId: draft.selectedFolderId,
    assetFile: draft.assetFile,
    assetDisplayName: draft.assetDisplayName,
    openMode: draft.openMode,
    assetParserMode: draft.assetParserMode,
    assetEmbedProfileId: draft.assetEmbedProfileId,
    assetEmbedOptionsJson: draft.assetEmbedOptionsJson,
    reloadFolders,
    reloadFolderAssets,
    setActivePanelTab,
    setFeedback,
    setFieldError,
    clearFieldErrors,
    parseJsonObjectInput,
  });

  const assetEditorActions = useLibraryAssetEditorActions({
    savingAsset,
    selectedFolderId: draft.selectedFolderId,
    editingAssetId: draft.editingAssetId,
    assetEditDisplayName: draft.assetEditDisplayName,
    assetEditFolderId: draft.assetEditFolderId,
    assetEditOpenMode: draft.assetEditOpenMode,
    assetEditParserMode: draft.assetEditParserMode,
    assetEditEmbedProfileId: draft.assetEditEmbedProfileId,
    assetEditEmbedOptionsJson: draft.assetEditEmbedOptionsJson,
    reloadFolders,
    reloadFolderAssets,
    setActivePanelTab,
    ensurePanelSectionOpen,
    setFeedback,
    setFieldError,
    clearFieldErrors,
    parseJsonObjectInput,
  });
  cancelAssetEdit = assetEditorActions.cancelAssetEdit;

  watch(draft.selectedFolderId, () => {
    syncFolderEditDraft();
    void reloadFolderAssets().catch(() => {});
  });

  useLibraryAdminLifecycle({
    loading,
    assetParserMode: draft.assetParserMode,
    assetEmbedProfileId: draft.assetEmbedProfileId,
    assetEmbedOptionsJson: draft.assetEmbedOptionsJson,
    assetEditParserMode: draft.assetEditParserMode,
    assetEditEmbedProfileId: draft.assetEditEmbedProfileId,
    assetEditEmbedOptionsJson: draft.assetEditEmbedOptionsJson,
    selectableEmbedProfiles: filters.selectableEmbedProfiles,
    clearFieldErrors,
    reloadTaxonomy: folderActions.reloadTaxonomy,
    reloadEmbedProfiles: embedActions.reloadEmbedProfiles,
    reloadFolders,
    reloadFolderAssets,
    setFeedback,
  });

  return {
    reloadFolders,
    reloadFolderAssets,
    ...assetSelection,
    ...embedActions,
    ...folderActions,
    ...assetCrudActions,
    ...assetEditorActions,
  };
}

