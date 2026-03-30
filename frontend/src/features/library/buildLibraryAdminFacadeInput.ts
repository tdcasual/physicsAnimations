import type { ComputedRef, Ref } from 'vue'
import type { createJsonObjectInputParser } from './createJsonObjectInputParser'
import type { useLibraryAdminActionWiring } from './useLibraryAdminActionWiring'
import type { useLibraryAdminDraftState } from './useLibraryAdminDraftState'
import type { useLibraryAdminFeedback } from './useLibraryAdminFeedback'
import type { useLibraryAssetFilters } from './useLibraryAssetFilters'
import type { useLibraryPanelSections } from './useLibraryPanelSections'
import type { createLibraryAdminStateFacade } from './useLibraryAdminStateFacade'

type LibraryAdminFeedbackState = ReturnType<typeof useLibraryAdminFeedback>
type LibraryAdminDraftState = ReturnType<typeof useLibraryAdminDraftState>
type LibraryAssetFiltersState = ReturnType<typeof useLibraryAssetFilters>
type LibraryPanelState = ReturnType<typeof useLibraryPanelSections>
type LibraryActionWiringState = ReturnType<typeof useLibraryAdminActionWiring>
type ParseJsonObjectInput = ReturnType<typeof createJsonObjectInputParser>
type LibraryAdminFacadeInput = Parameters<typeof createLibraryAdminStateFacade>[0]

type BuildLibraryAdminFacadeInputParams = {
  loading: Ref<boolean>
  saving: ComputedRef<boolean>
  savingFolder: Ref<boolean>
  savingAsset: Ref<boolean>
  savingEmbed: Ref<boolean>
  feedback: LibraryAdminFeedbackState
  draft: LibraryAdminDraftState
  filters: LibraryAssetFiltersState
  panels: LibraryPanelState
  actions: LibraryActionWiringState
  parseJsonObjectInput: ParseJsonObjectInput
}

export function buildLibraryAdminFacadeInput(
  params: BuildLibraryAdminFacadeInputParams
): LibraryAdminFacadeInput {
  const {
    loading,
    saving,
    savingFolder,
    savingAsset,
    savingEmbed,
    feedback,
    draft,
    filters,
    panels,
    actions,
    parseJsonObjectInput,
  } = params

  return {
    ui: {
      loading,
      saving,
      savingFolder,
      savingAsset,
      savingEmbed,
      feedback: feedback.feedback,
      feedbackError: feedback.feedbackError,
      fieldErrors: feedback.fieldErrors,
    },
    data: {
      folders: draft.folders,
      selectedFolderId: draft.selectedFolderId,
      selectedFolder: draft.selectedFolder,
      selectedFolderAssetCount: filters.selectedFolderAssetCount,
      folderAssets: draft.folderAssets,
      deletedAssets: draft.deletedAssets,
      embedProfiles: draft.embedProfiles,
      categories: actions.categories,
      groups: actions.groups,
      groupedCategoryOptions: actions.groupedCategoryOptions,
      selectableEmbedProfiles: filters.selectableEmbedProfiles,
      editingAsset: draft.editingAsset,
    },
    drafts: {
      folderName: actions.folderName,
      folderCategoryId: actions.folderCategoryId,
      createCoverFile: actions.createCoverFile,
      folderEditName: actions.folderEditName,
      folderEditCategoryId: actions.folderEditCategoryId,
      coverFile: actions.coverFile,
      assetFile: draft.assetFile,
      assetDisplayName: draft.assetDisplayName,
      openMode: draft.openMode,
      assetParserMode: draft.assetParserMode,
      assetEmbedProfileId: draft.assetEmbedProfileId,
      assetEmbedOptionsJson: draft.assetEmbedOptionsJson,
      editingAssetId: draft.editingAssetId,
      assetEditDisplayName: draft.assetEditDisplayName,
      assetEditFolderId: draft.assetEditFolderId,
      assetEditOpenMode: draft.assetEditOpenMode,
      assetEditParserMode: draft.assetEditParserMode,
      assetEditEmbedProfileId: draft.assetEditEmbedProfileId,
      assetEditEmbedOptionsJson: draft.assetEditEmbedOptionsJson,
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
    },
    filters: {
      folderSearchQuery: filters.folderSearchQuery,
      assetSearchQuery: filters.assetSearchQuery,
      profileSearchQuery: filters.profileSearchQuery,
      assetModeFilter: filters.assetModeFilter,
      assetEmbedProfileFilter: filters.assetEmbedProfileFilter,
      assetSortMode: filters.assetSortMode,
      filteredFolders: filters.filteredFolders,
      filteredFolderAssets: filters.filteredFolderAssets,
      sortedFilteredFolderAssets: filters.sortedFilteredFolderAssets,
      filteredEmbedProfiles: filters.filteredEmbedProfiles,
    },
    selection: {
      selectedAssetIds: actions.selectedAssetIds,
      selectedAssetCount: actions.selectedAssetCount,
      hasSelectedAssets: actions.hasSelectedAssets,
      hasUndoAssets: actions.hasUndoAssets,
      allFilteredAssetsSelected: actions.allFilteredAssetsSelected,
      undoAssetIds: actions.undoAssetIds,
      assetBatchMoveFolderId: actions.assetBatchMoveFolderId,
      assetBatchResult: actions.assetBatchResult,
    },
    panels: {
      activePanelTab: panels.activePanelTab,
      panelSections: panels.panelSections,
      operationLogFilter: feedback.operationLogFilter,
      folderAssetsLoadSeq: draft.folderAssetsLoadSeq,
    },
    logs: {
      operationLogs: feedback.operationLogs,
      filteredOperationLogs: feedback.filteredOperationLogs,
      formatOperationTime: feedback.formatOperationTime,
      pushOperationLog: feedback.pushOperationLog,
      clearOperationLogs: feedback.clearOperationLogs,
    },
    actions: {
      parseJsonObjectInput,
      syncFolderEditDraft: actions.syncFolderEditDraft,
      cancelAssetEdit: actions.cancelAssetEdit,
      clearSelectedAssets: actions.clearSelectedAssets,
      isAssetSelected: actions.isAssetSelected,
      toggleAssetSelection: actions.toggleAssetSelection,
      onAssetSelectChange: actions.onAssetSelectChange,
      onSelectAllFilteredAssetsChange: actions.onSelectAllFilteredAssetsChange,
      cancelEmbedProfileEdit: actions.cancelEmbedProfileEdit,
      setFeedback: feedback.setFeedback,
      setFieldError: feedback.setFieldError,
      clearFieldErrors: feedback.clearFieldErrors,
      getFieldError: feedback.getFieldError,
      setActivePanelTab: panels.setActivePanelTab,
      selectFolder: actions.selectFolder,
      isPanelSectionOpen: panels.isPanelSectionOpen,
      togglePanelSection: panels.togglePanelSection,
      ensurePanelSectionOpen: panels.ensurePanelSectionOpen,
      getApiErrorCode: feedback.getApiErrorCode,
      onCreateCoverFileChange: actions.onCreateCoverFileChange,
      onCoverFileChange: actions.onCoverFileChange,
      onAssetFileChange: actions.onAssetFileChange,
      reloadFolders: actions.reloadFolders,
      syncCategorySelection: actions.syncCategorySelection,
      syncFolderEditCategorySelection: actions.syncFolderEditCategorySelection,
      reloadTaxonomy: actions.reloadTaxonomy,
      reloadFolderAssets: actions.reloadFolderAssets,
      reloadEmbedProfiles: actions.reloadEmbedProfiles,
      createFolderEntry: actions.createFolderEntry,
      saveFolderMeta: actions.saveFolderMeta,
      uploadCover: actions.uploadCover,
      uploadAssetEntry: actions.uploadAssetEntry,
      switchAssetOpenMode: actions.switchAssetOpenMode,
      runAssetBatchOpenMode: actions.runAssetBatchOpenMode,
      runAssetBatchMove: actions.runAssetBatchMove,
      runAssetBatchDelete: actions.runAssetBatchDelete,
      runAssetBatchUndo: actions.runAssetBatchUndo,
      restoreDeletedAsset: actions.restoreDeletedAsset,
      removeDeletedAssetPermanently: actions.removeDeletedAssetPermanently,
      startEditAsset: actions.startEditAsset,
      saveAssetEdit: actions.saveAssetEdit,
      createEmbedProfileEntry: actions.createEmbedProfileEntry,
      startEditEmbedProfile: actions.startEditEmbedProfile,
      saveEmbedProfileEdit: actions.saveEmbedProfileEdit,
      removeEmbedProfile: actions.removeEmbedProfile,
      syncEmbedProfileEntry: actions.syncEmbedProfileEntry,
      renameAssetDisplayName: actions.renameAssetDisplayName,
      removeAsset: actions.removeAsset,
      removeFolder: actions.removeFolder,
    },
  }
}
