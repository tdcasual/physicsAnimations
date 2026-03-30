import { computed, watch, type Ref } from 'vue'
import { usePendingChangesGuard } from '../admin/composables/usePendingChangesGuard'
import type { LibraryPanelTab } from './libraryAdminModels'
import type { LibraryAsset, LibraryEmbedProfile } from './types'
import { useLibraryAssetCrudActions } from './useLibraryAssetCrudActions'
import { useLibraryAssetEditorActions } from './useLibraryAssetEditorActions'
import { useLibraryAdminLifecycle } from './useLibraryAdminLifecycle'
import { useLibraryFolderActions } from './useLibraryFolderActions'
import { useLibraryAssetSelection } from './useLibraryAssetSelection'
import { useLibraryEmbedProfileActions } from './useLibraryEmbedProfileActions'
import { useLibraryAdminDataActions } from './useLibraryAdminDataActions'
import type { createJsonObjectInputParser } from './createJsonObjectInputParser'
import type { useLibraryAdminDraftState } from './useLibraryAdminDraftState'
import type { useLibraryAdminFeedback } from './useLibraryAdminFeedback'
import type { useLibraryAssetFilters } from './useLibraryAssetFilters'
import type { useLibraryPanelSections } from './useLibraryPanelSections'

type LibraryAdminDraftState = ReturnType<typeof useLibraryAdminDraftState>
type LibraryAdminFeedbackState = ReturnType<typeof useLibraryAdminFeedback>
type LibraryAssetFiltersState = ReturnType<typeof useLibraryAssetFilters>
type LibraryPanelSectionsState = ReturnType<typeof useLibraryPanelSections>
type ParseJsonObjectInput = ReturnType<typeof createJsonObjectInputParser>

type UseLibraryAdminActionWiringParams = {
  loading: Ref<boolean>
  savingFolder: Ref<boolean>
  savingAsset: Ref<boolean>
  savingEmbed: Ref<boolean>
  feedback: LibraryAdminFeedbackState
  draft: LibraryAdminDraftState
  filters: LibraryAssetFiltersState
  panels: LibraryPanelSectionsState
  parseJsonObjectInput: ParseJsonObjectInput
}

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
  } = params
  const { setFeedback, setFieldError, clearFieldErrors, getApiErrorCode } = feedback
  const { setActivePanelTab, ensurePanelSectionOpen } = panels

  let reloadFolders: () => Promise<void> = async () => {}
  let reloadFolderAssets: () => Promise<void> = async () => {}
  let syncFolderEditDraft = () => {}
  let cancelAssetEdit = () => {}

  const assetSelection = useLibraryAssetSelection({
    savingAsset,
    selectedFolderId: draft.selectedFolderId,
    filteredFolderAssets: filters.filteredFolderAssets,
    sortedFilteredFolderAssets: filters.sortedFilteredFolderAssets,
    reloadFolders: () => reloadFolders(),
    reloadFolderAssets: () => reloadFolderAssets(),
    setFeedback,
    getApiErrorCode,
  })

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
  })

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
  })
  reloadFolders = dataActions.reloadFolders
  reloadFolderAssets = dataActions.reloadFolderAssets

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
  })
  syncFolderEditDraft = folderActions.syncFolderEditDraft

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
  })

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
  })
  cancelAssetEdit = assetEditorActions.cancelAssetEdit

  const editingEmbedProfile = computed(
    () =>
      draft.embedProfiles.value.find(profile => profile.id === draft.editingEmbedProfileId.value) ||
      null
  )

  const hasPendingFolderCreateChanges = computed(
    () =>
      Boolean(folderActions.folderName.value.trim()) ||
      folderActions.folderCategoryId.value !== 'other' ||
      folderActions.createCoverFile.value !== null
  )

  const hasPendingFolderEditChanges = computed(() => {
    const folder = draft.selectedFolder.value
    if (!folder) return false
    const baselineCategoryId =
      folder.categoryId || folderActions.groupedCategoryOptions.value[0]?.value || 'other'
    return (
      folderActions.folderEditName.value !== (folder.name || '') ||
      folderActions.folderEditCategoryId.value !== baselineCategoryId
    )
  })

  const hasPendingAssetUploadChanges = computed(() => {
    if (draft.assetFile.value) return true
    if (draft.assetDisplayName.value.trim()) return true
    if (draft.openMode.value !== 'embed') return true
    if (draft.assetParserMode.value !== 'auto') return true
    if (draft.assetEmbedProfileId.value) return true
    return Boolean(String(draft.assetEmbedOptionsJson.value || '').trim())
  })

  const hasPendingAssetEditChanges = computed(() => {
    const asset = draft.editingAsset.value
    if (!asset) return false
    const baselineEmbedOptions = JSON.stringify(asset.embedOptions || {}, null, 2)
    return (
      draft.assetEditDisplayName.value !== (asset.displayName || '') ||
      draft.assetEditFolderId.value !== (asset.folderId || draft.selectedFolderId.value) ||
      draft.assetEditOpenMode.value !== asset.openMode ||
      draft.assetEditParserMode.value !== (asset.embedProfileId ? 'profile' : 'auto') ||
      draft.assetEditEmbedProfileId.value !== (asset.embedProfileId || '') ||
      draft.assetEditEmbedOptionsJson.value !== baselineEmbedOptions
    )
  })

  const hasPendingEmbedCreateChanges = computed(
    () =>
      Boolean(draft.embedProfileName.value.trim()) ||
      Boolean(draft.embedScriptUrl.value.trim()) ||
      Boolean(draft.embedFallbackScriptUrl.value.trim()) ||
      Boolean(draft.embedViewerPath.value.trim()) ||
      draft.embedConstructorName.value !== 'ElectricFieldApp' ||
      draft.embedAssetUrlOptionKey.value !== 'sceneUrl' ||
      Boolean(draft.embedExtensionsText.value.trim()) ||
      draft.embedDefaultOptionsJson.value !== '{}' ||
      draft.embedEnabled.value !== true
  )

  const hasPendingEmbedEditChanges = computed(() => {
    const profile = editingEmbedProfile.value
    if (!profile) return false
    return (
      draft.embedEditName.value !== (profile.name || '') ||
      draft.embedEditScriptUrl.value !== (profile.remoteScriptUrl || profile.scriptUrl || '') ||
      draft.embedEditFallbackScriptUrl.value !== (profile.fallbackScriptUrl || '') ||
      draft.embedEditViewerPath.value !== (profile.remoteViewerPath || profile.viewerPath || '') ||
      draft.embedEditConstructorName.value !== (profile.constructorName || 'ElectricFieldApp') ||
      draft.embedEditAssetUrlOptionKey.value !== (profile.assetUrlOptionKey || 'sceneUrl') ||
      draft.embedEditExtensionsText.value !==
        (Array.isArray(profile.matchExtensions) ? profile.matchExtensions.join(',') : '') ||
      draft.embedEditDefaultOptionsJson.value !==
        JSON.stringify(profile.defaultOptions || {}, null, 2) ||
      draft.embedEditEnabled.value !== (profile.enabled !== false)
    )
  })

  const hasPendingFolderSwitchChanges = computed(
    () => hasPendingFolderEditChanges.value || hasPendingAssetEditChanges.value
  )

  const hasPendingChanges = computed(
    () =>
      hasPendingFolderCreateChanges.value ||
      hasPendingFolderEditChanges.value ||
      hasPendingAssetUploadChanges.value ||
      hasPendingAssetEditChanges.value ||
      hasPendingEmbedCreateChanges.value ||
      hasPendingEmbedEditChanges.value
  )

  function confirmDiscardPendingChanges(message = '资源库中有未保存更改，确定继续吗？') {
    if (!hasPendingChanges.value) return true
    return window.confirm(message)
  }

  function selectFolder(folderId: string, options: { panelTab?: LibraryPanelTab } = {}) {
    if (folderId === draft.selectedFolderId.value) {
      if (options.panelTab) setActivePanelTab(options.panelTab)
      return
    }
    if (hasPendingFolderSwitchChanges.value) {
      if (!confirmDiscardPendingChanges('当前资源库编辑内容有未保存更改，确定切换文件夹吗？'))
        return
    }
    draft.selectedFolderId.value = folderId
    syncFolderEditDraft()
    if (options.panelTab) setActivePanelTab(options.panelTab)
  }

  function startEditAsset(asset: LibraryAsset) {
    if (asset.id !== draft.editingAssetId.value && hasPendingAssetEditChanges.value) {
      if (!confirmDiscardPendingChanges('当前资源编辑有未保存更改，确定切换吗？')) return
    }
    assetEditorActions.startEditAsset(asset)
  }

  function startEditEmbedProfile(profile: LibraryEmbedProfile) {
    if (profile.id !== draft.editingEmbedProfileId.value && hasPendingEmbedEditChanges.value) {
      if (!confirmDiscardPendingChanges('当前 Embed 平台编辑有未保存更改，确定切换吗？')) return
    }
    embedActions.startEditEmbedProfile(profile)
  }

  watch(draft.selectedFolderId, () => {
    syncFolderEditDraft()
    void reloadFolderAssets().catch(() => {})
  })

  usePendingChangesGuard({
    hasPendingChanges,
    isBlocked: computed(() => savingFolder.value || savingAsset.value || savingEmbed.value),
    message: '资源库内容有未保存更改，确定离开当前页面吗？',
  })

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
  })

  return {
    reloadFolders,
    reloadFolderAssets,
    hasPendingChanges,
    ...assetSelection,
    ...embedActions,
    ...folderActions,
    ...assetCrudActions,
    ...assetEditorActions,
    selectFolder,
    startEditAsset,
    startEditEmbedProfile,
  }
}
