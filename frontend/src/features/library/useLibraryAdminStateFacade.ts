import type { ComputedRef, Ref } from "vue";
import type {
  AssetSortMode,
  AssetBatchResult,
  CategoryRow,
  GroupRow,
  JsonObjectParseResult,
  LibraryPanelTab,
  OperationLogEntry,
  OperationLogLevel,
} from "./libraryAdminModels";
import type { LibraryAsset, LibraryEmbedProfile, LibraryFolder, LibraryOpenMode } from "./types";

type LibraryAdminStateInput = {
  activePanelTab: Ref<LibraryPanelTab>;
  allFilteredAssetsSelected: ComputedRef<boolean>;
  assetBatchMoveFolderId: Ref<string>;
  assetBatchResult: Ref<AssetBatchResult | null>;
  assetDisplayName: Ref<string>;
  assetEditDisplayName: Ref<string>;
  assetEditEmbedOptionsJson: Ref<string>;
  assetEditEmbedProfileId: Ref<string>;
  assetEditFolderId: Ref<string>;
  assetEditOpenMode: Ref<LibraryOpenMode>;
  assetEditParserMode: Ref<"auto" | "profile">;
  assetEmbedOptionsJson: Ref<string>;
  assetEmbedProfileFilter: Ref<string>;
  assetEmbedProfileId: Ref<string>;
  assetFile: Ref<File | null>;
  assetModeFilter: Ref<"all" | LibraryOpenMode>;
  assetParserMode: Ref<"auto" | "profile">;
  assetSearchQuery: Ref<string>;
  assetSortMode: Ref<AssetSortMode>;
  cancelAssetEdit: () => void;
  cancelEmbedProfileEdit: () => void;
  categories: Ref<CategoryRow[]>;
  clearFieldErrors: (...fieldKeys: string[]) => void;
  clearOperationLogs: () => void;
  clearSelectedAssets: () => void;
  coverFile: Ref<File | null>;
  createCoverFile: Ref<File | null>;
  createEmbedProfileEntry: () => Promise<void>;
  createFolderEntry: () => Promise<void>;
  deletedAssets: Ref<LibraryAsset[]>;
  editingAsset: ComputedRef<LibraryAsset | null>;
  editingAssetId: Ref<string>;
  editingEmbedProfileId: Ref<string>;
  embedAssetUrlOptionKey: Ref<string>;
  embedConstructorName: Ref<string>;
  embedDefaultOptionsJson: Ref<string>;
  embedEditAssetUrlOptionKey: Ref<string>;
  embedEditConstructorName: Ref<string>;
  embedEditDefaultOptionsJson: Ref<string>;
  embedEditEnabled: Ref<boolean>;
  embedEditExtensionsText: Ref<string>;
  embedEditFallbackScriptUrl: Ref<string>;
  embedEditName: Ref<string>;
  embedEditScriptUrl: Ref<string>;
  embedEditViewerPath: Ref<string>;
  embedEnabled: Ref<boolean>;
  embedExtensionsText: Ref<string>;
  embedFallbackScriptUrl: Ref<string>;
  embedProfileName: Ref<string>;
  embedProfiles: Ref<LibraryEmbedProfile[]>;
  embedScriptUrl: Ref<string>;
  embedViewerPath: Ref<string>;
  ensurePanelSectionOpen: (key: string) => void;
  feedback: Ref<string>;
  feedbackError: Ref<boolean>;
  fieldErrors: Ref<Record<string, string>>;
  filteredEmbedProfiles: ComputedRef<LibraryEmbedProfile[]>;
  filteredFolderAssets: ComputedRef<LibraryAsset[]>;
  filteredFolders: ComputedRef<LibraryFolder[]>;
  filteredOperationLogs: ComputedRef<OperationLogEntry[]>;
  folderAssets: Ref<LibraryAsset[]>;
  folderAssetsLoadSeq: Ref<number>;
  folderCategoryId: Ref<string>;
  folderEditCategoryId: Ref<string>;
  folderEditName: Ref<string>;
  folderName: Ref<string>;
  folderSearchQuery: Ref<string>;
  folders: Ref<LibraryFolder[]>;
  formatOperationTime: (value: string) => string;
  getApiErrorCode: (err: unknown) => string;
  getFieldError: (fieldKey: string) => string;
  groupedCategoryOptions: ComputedRef<Array<{ value: string; label: string }>>;
  groups: Ref<GroupRow[]>;
  hasSelectedAssets: ComputedRef<boolean>;
  hasUndoAssets: ComputedRef<boolean>;
  isAssetSelected: (assetId: string) => boolean;
  isPanelSectionOpen: (key: string) => boolean;
  loading: Ref<boolean>;
  onAssetFileChange: (event: Event) => void;
  onAssetSelectChange: (assetId: string, event: Event) => void;
  onCoverFileChange: (event: Event) => void;
  onCreateCoverFileChange: (event: Event) => void;
  onSelectAllFilteredAssetsChange: (event: Event) => void;
  openMode: Ref<LibraryOpenMode>;
  operationLogFilter: Ref<"all" | OperationLogLevel>;
  operationLogs: Ref<OperationLogEntry[]>;
  panelSections: Ref<Record<string, boolean>>;
  parseJsonObjectInput: (raw: string, fieldLabel: string, fieldKey?: string) => JsonObjectParseResult;
  profileSearchQuery: Ref<string>;
  pushOperationLog: (message: string, level?: OperationLogLevel) => void;
  reloadEmbedProfiles: () => Promise<void>;
  reloadFolderAssets: () => Promise<void>;
  reloadFolders: () => Promise<void>;
  reloadTaxonomy: () => Promise<void>;
  removeAsset: (assetId: string) => Promise<void>;
  removeDeletedAssetPermanently: (asset: LibraryAsset) => Promise<void>;
  removeEmbedProfile: (profileId: string) => Promise<void>;
  removeFolder: (folderId: string) => Promise<void>;
  renameAssetDisplayName: (asset: LibraryAsset) => Promise<void>;
  restoreDeletedAsset: (assetId: string) => Promise<void>;
  runAssetBatchDelete: () => Promise<void>;
  runAssetBatchMove: () => Promise<void>;
  runAssetBatchOpenMode: (mode: LibraryOpenMode) => Promise<void>;
  runAssetBatchUndo: () => Promise<void>;
  saveAssetEdit: () => Promise<void>;
  saveEmbedProfileEdit: () => Promise<void>;
  saveFolderMeta: () => Promise<void>;
  saving: ComputedRef<boolean>;
  savingAsset: Ref<boolean>;
  savingEmbed: Ref<boolean>;
  savingFolder: Ref<boolean>;
  selectableEmbedProfiles: ComputedRef<LibraryEmbedProfile[]>;
  selectedAssetCount: ComputedRef<number>;
  selectedAssetIds: Ref<string[]>;
  selectedFolder: ComputedRef<LibraryFolder | null>;
  selectedFolderAssetCount: ComputedRef<number>;
  selectedFolderId: Ref<string>;
  setActivePanelTab: (tab: LibraryPanelTab) => void;
  setFeedback: (text: string, isError?: boolean) => void;
  setFieldError: (fieldKey: string, text: string) => void;
  sortedFilteredFolderAssets: ComputedRef<LibraryAsset[]>;
  startEditAsset: (asset: LibraryAsset) => void;
  startEditEmbedProfile: (profile: LibraryEmbedProfile) => void;
  switchAssetOpenMode: (asset: LibraryAsset, mode: LibraryOpenMode) => Promise<void>;
  syncCategorySelection: () => void;
  syncEmbedProfileEntry: (profileId: string) => Promise<void>;
  syncFolderEditCategorySelection: () => void;
  syncFolderEditDraft: () => void;
  toggleAssetSelection: (assetId: string, checked: boolean) => void;
  togglePanelSection: (key: string) => void;
  undoAssetIds: Ref<string[]>;
  uploadAssetEntry: () => Promise<void>;
  uploadCover: () => Promise<void>;
};

type FacadeBuckets<T extends LibraryAdminStateInput> = {
  ui: Pick<T, "loading" | "saving" | "savingFolder" | "savingAsset" | "savingEmbed" | "feedback" | "feedbackError" | "fieldErrors">;
  data: Pick<T, "folders" | "selectedFolderId" | "selectedFolder" | "selectedFolderAssetCount" | "folderAssets" | "deletedAssets" | "embedProfiles" | "categories" | "groups" | "groupedCategoryOptions" | "selectableEmbedProfiles" | "editingAsset">;
  drafts: Pick<T, "folderName" | "folderCategoryId" | "createCoverFile" | "folderEditName" | "folderEditCategoryId" | "coverFile" | "assetFile" | "assetDisplayName" | "openMode" | "assetParserMode" | "assetEmbedProfileId" | "assetEmbedOptionsJson" | "editingAssetId" | "assetEditDisplayName" | "assetEditFolderId" | "assetEditOpenMode" | "assetEditParserMode" | "assetEditEmbedProfileId" | "assetEditEmbedOptionsJson" | "embedProfileName" | "embedScriptUrl" | "embedFallbackScriptUrl" | "embedViewerPath" | "embedConstructorName" | "embedAssetUrlOptionKey" | "embedExtensionsText" | "embedDefaultOptionsJson" | "embedEnabled" | "editingEmbedProfileId" | "embedEditName" | "embedEditScriptUrl" | "embedEditFallbackScriptUrl" | "embedEditViewerPath" | "embedEditConstructorName" | "embedEditAssetUrlOptionKey" | "embedEditExtensionsText" | "embedEditDefaultOptionsJson" | "embedEditEnabled">;
  filters: Pick<T, "folderSearchQuery" | "assetSearchQuery" | "profileSearchQuery" | "assetModeFilter" | "assetEmbedProfileFilter" | "assetSortMode" | "filteredFolders" | "filteredFolderAssets" | "sortedFilteredFolderAssets" | "filteredEmbedProfiles">;
  selection: Pick<T, "selectedAssetIds" | "selectedAssetCount" | "hasSelectedAssets" | "hasUndoAssets" | "allFilteredAssetsSelected" | "undoAssetIds" | "assetBatchMoveFolderId" | "assetBatchResult">;
  panels: Pick<T, "activePanelTab" | "panelSections" | "operationLogFilter" | "folderAssetsLoadSeq">;
  logs: Pick<T, "operationLogs" | "filteredOperationLogs" | "formatOperationTime" | "pushOperationLog" | "clearOperationLogs">;
  actions: Pick<T, "parseJsonObjectInput" | "syncFolderEditDraft" | "cancelAssetEdit" | "clearSelectedAssets" | "isAssetSelected" | "toggleAssetSelection" | "onAssetSelectChange" | "onSelectAllFilteredAssetsChange" | "cancelEmbedProfileEdit" | "setFeedback" | "setFieldError" | "clearFieldErrors" | "getFieldError" | "setActivePanelTab" | "isPanelSectionOpen" | "togglePanelSection" | "ensurePanelSectionOpen" | "getApiErrorCode" | "onCreateCoverFileChange" | "onCoverFileChange" | "onAssetFileChange" | "reloadFolders" | "syncCategorySelection" | "syncFolderEditCategorySelection" | "reloadTaxonomy" | "reloadFolderAssets" | "reloadEmbedProfiles" | "createFolderEntry" | "saveFolderMeta" | "uploadCover" | "uploadAssetEntry" | "switchAssetOpenMode" | "runAssetBatchOpenMode" | "runAssetBatchMove" | "runAssetBatchDelete" | "runAssetBatchUndo" | "restoreDeletedAsset" | "removeDeletedAssetPermanently" | "startEditAsset" | "saveAssetEdit" | "createEmbedProfileEntry" | "startEditEmbedProfile" | "saveEmbedProfileEdit" | "removeEmbedProfile" | "syncEmbedProfileEntry" | "renameAssetDisplayName" | "removeAsset" | "removeFolder">;
};

export function createLibraryAdminStateFacade<T extends LibraryAdminStateInput>(state: T): FacadeBuckets<T> {
  const s = state;

  return {
    ui: {
      loading: s.loading,
      saving: s.saving,
      savingFolder: s.savingFolder,
      savingAsset: s.savingAsset,
      savingEmbed: s.savingEmbed,
      feedback: s.feedback,
      feedbackError: s.feedbackError,
      fieldErrors: s.fieldErrors,
    },
    data: {
      folders: s.folders,
      selectedFolderId: s.selectedFolderId,
      selectedFolder: s.selectedFolder,
      selectedFolderAssetCount: s.selectedFolderAssetCount,
      folderAssets: s.folderAssets,
      deletedAssets: s.deletedAssets,
      embedProfiles: s.embedProfiles,
      categories: s.categories,
      groups: s.groups,
      groupedCategoryOptions: s.groupedCategoryOptions,
      selectableEmbedProfiles: s.selectableEmbedProfiles,
      editingAsset: s.editingAsset,
    },
    drafts: {
      folderName: s.folderName,
      folderCategoryId: s.folderCategoryId,
      createCoverFile: s.createCoverFile,
      folderEditName: s.folderEditName,
      folderEditCategoryId: s.folderEditCategoryId,
      coverFile: s.coverFile,
      assetFile: s.assetFile,
      assetDisplayName: s.assetDisplayName,
      openMode: s.openMode,
      assetParserMode: s.assetParserMode,
      assetEmbedProfileId: s.assetEmbedProfileId,
      assetEmbedOptionsJson: s.assetEmbedOptionsJson,
      editingAssetId: s.editingAssetId,
      assetEditDisplayName: s.assetEditDisplayName,
      assetEditFolderId: s.assetEditFolderId,
      assetEditOpenMode: s.assetEditOpenMode,
      assetEditParserMode: s.assetEditParserMode,
      assetEditEmbedProfileId: s.assetEditEmbedProfileId,
      assetEditEmbedOptionsJson: s.assetEditEmbedOptionsJson,
      embedProfileName: s.embedProfileName,
      embedScriptUrl: s.embedScriptUrl,
      embedFallbackScriptUrl: s.embedFallbackScriptUrl,
      embedViewerPath: s.embedViewerPath,
      embedConstructorName: s.embedConstructorName,
      embedAssetUrlOptionKey: s.embedAssetUrlOptionKey,
      embedExtensionsText: s.embedExtensionsText,
      embedDefaultOptionsJson: s.embedDefaultOptionsJson,
      embedEnabled: s.embedEnabled,
      editingEmbedProfileId: s.editingEmbedProfileId,
      embedEditName: s.embedEditName,
      embedEditScriptUrl: s.embedEditScriptUrl,
      embedEditFallbackScriptUrl: s.embedEditFallbackScriptUrl,
      embedEditViewerPath: s.embedEditViewerPath,
      embedEditConstructorName: s.embedEditConstructorName,
      embedEditAssetUrlOptionKey: s.embedEditAssetUrlOptionKey,
      embedEditExtensionsText: s.embedEditExtensionsText,
      embedEditDefaultOptionsJson: s.embedEditDefaultOptionsJson,
      embedEditEnabled: s.embedEditEnabled,
    },
    filters: {
      folderSearchQuery: s.folderSearchQuery,
      assetSearchQuery: s.assetSearchQuery,
      profileSearchQuery: s.profileSearchQuery,
      assetModeFilter: s.assetModeFilter,
      assetEmbedProfileFilter: s.assetEmbedProfileFilter,
      assetSortMode: s.assetSortMode,
      filteredFolders: s.filteredFolders,
      filteredFolderAssets: s.filteredFolderAssets,
      sortedFilteredFolderAssets: s.sortedFilteredFolderAssets,
      filteredEmbedProfiles: s.filteredEmbedProfiles,
    },
    selection: {
      selectedAssetIds: s.selectedAssetIds,
      selectedAssetCount: s.selectedAssetCount,
      hasSelectedAssets: s.hasSelectedAssets,
      hasUndoAssets: s.hasUndoAssets,
      allFilteredAssetsSelected: s.allFilteredAssetsSelected,
      undoAssetIds: s.undoAssetIds,
      assetBatchMoveFolderId: s.assetBatchMoveFolderId,
      assetBatchResult: s.assetBatchResult,
    },
    panels: {
      activePanelTab: s.activePanelTab,
      panelSections: s.panelSections,
      operationLogFilter: s.operationLogFilter,
      folderAssetsLoadSeq: s.folderAssetsLoadSeq,
    },
    logs: {
      operationLogs: s.operationLogs,
      filteredOperationLogs: s.filteredOperationLogs,
      formatOperationTime: s.formatOperationTime,
      pushOperationLog: s.pushOperationLog,
      clearOperationLogs: s.clearOperationLogs,
    },
    actions: {
      parseJsonObjectInput: s.parseJsonObjectInput,
      syncFolderEditDraft: s.syncFolderEditDraft,
      cancelAssetEdit: s.cancelAssetEdit,
      clearSelectedAssets: s.clearSelectedAssets,
      isAssetSelected: s.isAssetSelected,
      toggleAssetSelection: s.toggleAssetSelection,
      onAssetSelectChange: s.onAssetSelectChange,
      onSelectAllFilteredAssetsChange: s.onSelectAllFilteredAssetsChange,
      cancelEmbedProfileEdit: s.cancelEmbedProfileEdit,
      setFeedback: s.setFeedback,
      setFieldError: s.setFieldError,
      clearFieldErrors: s.clearFieldErrors,
      getFieldError: s.getFieldError,
      setActivePanelTab: s.setActivePanelTab,
      isPanelSectionOpen: s.isPanelSectionOpen,
      togglePanelSection: s.togglePanelSection,
      ensurePanelSectionOpen: s.ensurePanelSectionOpen,
      getApiErrorCode: s.getApiErrorCode,
      onCreateCoverFileChange: s.onCreateCoverFileChange,
      onCoverFileChange: s.onCoverFileChange,
      onAssetFileChange: s.onAssetFileChange,
      reloadFolders: s.reloadFolders,
      syncCategorySelection: s.syncCategorySelection,
      syncFolderEditCategorySelection: s.syncFolderEditCategorySelection,
      reloadTaxonomy: s.reloadTaxonomy,
      reloadFolderAssets: s.reloadFolderAssets,
      reloadEmbedProfiles: s.reloadEmbedProfiles,
      createFolderEntry: s.createFolderEntry,
      saveFolderMeta: s.saveFolderMeta,
      uploadCover: s.uploadCover,
      uploadAssetEntry: s.uploadAssetEntry,
      switchAssetOpenMode: s.switchAssetOpenMode,
      runAssetBatchOpenMode: s.runAssetBatchOpenMode,
      runAssetBatchMove: s.runAssetBatchMove,
      runAssetBatchDelete: s.runAssetBatchDelete,
      runAssetBatchUndo: s.runAssetBatchUndo,
      restoreDeletedAsset: s.restoreDeletedAsset,
      removeDeletedAssetPermanently: s.removeDeletedAssetPermanently,
      startEditAsset: s.startEditAsset,
      saveAssetEdit: s.saveAssetEdit,
      createEmbedProfileEntry: s.createEmbedProfileEntry,
      startEditEmbedProfile: s.startEditEmbedProfile,
      saveEmbedProfileEdit: s.saveEmbedProfileEdit,
      removeEmbedProfile: s.removeEmbedProfile,
      syncEmbedProfileEntry: s.syncEmbedProfileEntry,
      renameAssetDisplayName: s.renameAssetDisplayName,
      removeAsset: s.removeAsset,
      removeFolder: s.removeFolder,
    },
  };
}
