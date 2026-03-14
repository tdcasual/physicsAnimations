import type { ComputedRef, Ref } from "vue";
import type {
  AssetBatchResult,
  AssetSortMode,
  CategoryRow,
  GroupRow,
  JsonObjectParseResult,
  LibraryPanelTab,
  OperationLogEntry,
  OperationLogLevel,
} from "./libraryAdminModels";
import type { LibraryAsset, LibraryEmbedProfile, LibraryFolder, LibraryOpenMode } from "./types";

type LibraryAdminUiState = {
  loading: Ref<boolean>;
  saving: ComputedRef<boolean>;
  savingFolder: Ref<boolean>;
  savingAsset: Ref<boolean>;
  savingEmbed: Ref<boolean>;
  feedback: Ref<string>;
  feedbackError: Ref<boolean>;
  fieldErrors: Ref<Record<string, string>>;
};

type LibraryAdminDataState = {
  folders: Ref<LibraryFolder[]>;
  selectedFolderId: Ref<string>;
  selectedFolder: ComputedRef<LibraryFolder | null>;
  selectedFolderAssetCount: ComputedRef<number>;
  folderAssets: Ref<LibraryAsset[]>;
  deletedAssets: Ref<LibraryAsset[]>;
  embedProfiles: Ref<LibraryEmbedProfile[]>;
  categories: Ref<CategoryRow[]>;
  groups: Ref<GroupRow[]>;
  groupedCategoryOptions: ComputedRef<Array<{ value: string; label: string }>>;
  selectableEmbedProfiles: ComputedRef<LibraryEmbedProfile[]>;
  editingAsset: ComputedRef<LibraryAsset | null>;
};

type LibraryAdminDraftState = {
  folderName: Ref<string>;
  folderCategoryId: Ref<string>;
  createCoverFile: Ref<File | null>;
  folderEditName: Ref<string>;
  folderEditCategoryId: Ref<string>;
  coverFile: Ref<File | null>;
  assetFile: Ref<File | null>;
  assetDisplayName: Ref<string>;
  openMode: Ref<LibraryOpenMode>;
  assetParserMode: Ref<"auto" | "profile">;
  assetEmbedProfileId: Ref<string>;
  assetEmbedOptionsJson: Ref<string>;
  editingAssetId: Ref<string>;
  assetEditDisplayName: Ref<string>;
  assetEditFolderId: Ref<string>;
  assetEditOpenMode: Ref<LibraryOpenMode>;
  assetEditParserMode: Ref<"auto" | "profile">;
  assetEditEmbedProfileId: Ref<string>;
  assetEditEmbedOptionsJson: Ref<string>;
  embedProfileName: Ref<string>;
  embedScriptUrl: Ref<string>;
  embedFallbackScriptUrl: Ref<string>;
  embedViewerPath: Ref<string>;
  embedConstructorName: Ref<string>;
  embedAssetUrlOptionKey: Ref<string>;
  embedExtensionsText: Ref<string>;
  embedDefaultOptionsJson: Ref<string>;
  embedEnabled: Ref<boolean>;
  editingEmbedProfileId: Ref<string>;
  embedEditName: Ref<string>;
  embedEditScriptUrl: Ref<string>;
  embedEditFallbackScriptUrl: Ref<string>;
  embedEditViewerPath: Ref<string>;
  embedEditConstructorName: Ref<string>;
  embedEditAssetUrlOptionKey: Ref<string>;
  embedEditExtensionsText: Ref<string>;
  embedEditDefaultOptionsJson: Ref<string>;
  embedEditEnabled: Ref<boolean>;
};

type LibraryAdminFilterState = {
  folderSearchQuery: Ref<string>;
  assetSearchQuery: Ref<string>;
  profileSearchQuery: Ref<string>;
  assetModeFilter: Ref<"all" | LibraryOpenMode>;
  assetEmbedProfileFilter: Ref<string>;
  assetSortMode: Ref<AssetSortMode>;
  filteredFolders: ComputedRef<LibraryFolder[]>;
  filteredFolderAssets: ComputedRef<LibraryAsset[]>;
  sortedFilteredFolderAssets: ComputedRef<LibraryAsset[]>;
  filteredEmbedProfiles: ComputedRef<LibraryEmbedProfile[]>;
};

type LibraryAdminSelectionState = {
  selectedAssetIds: Ref<string[]>;
  selectedAssetCount: ComputedRef<number>;
  hasSelectedAssets: ComputedRef<boolean>;
  hasUndoAssets: ComputedRef<boolean>;
  allFilteredAssetsSelected: ComputedRef<boolean>;
  undoAssetIds: Ref<string[]>;
  assetBatchMoveFolderId: Ref<string>;
  assetBatchResult: Ref<AssetBatchResult | null>;
};

type LibraryAdminPanelState = {
  activePanelTab: Ref<LibraryPanelTab>;
  panelSections: Ref<Record<string, boolean>>;
  operationLogFilter: Ref<"all" | OperationLogLevel>;
  folderAssetsLoadSeq: Ref<number>;
};

type LibraryAdminLogState = {
  operationLogs: Ref<OperationLogEntry[]>;
  filteredOperationLogs: ComputedRef<OperationLogEntry[]>;
  formatOperationTime: (value: string) => string;
  pushOperationLog: (message: string, level?: OperationLogLevel) => void;
  clearOperationLogs: () => void;
};

type LibraryAdminActionState = {
  parseJsonObjectInput: (raw: string, fieldLabel: string, fieldKey?: string) => JsonObjectParseResult;
  syncFolderEditDraft: () => void;
  cancelAssetEdit: () => void;
  clearSelectedAssets: () => void;
  isAssetSelected: (assetId: string) => boolean;
  toggleAssetSelection: (assetId: string, checked: boolean) => void;
  onAssetSelectChange: (assetId: string, event: Event) => void;
  onSelectAllFilteredAssetsChange: (event: Event) => void;
  cancelEmbedProfileEdit: () => void;
  setFeedback: (text: string, isError?: boolean) => void;
  setFieldError: (fieldKey: string, text: string) => void;
  clearFieldErrors: (...fieldKeys: string[]) => void;
  getFieldError: (fieldKey: string) => string;
  setActivePanelTab: (tab: LibraryPanelTab) => void;
  selectFolder: (folderId: string, options?: { panelTab?: LibraryPanelTab }) => void;
  isPanelSectionOpen: (key: string) => boolean;
  togglePanelSection: (key: string) => void;
  ensurePanelSectionOpen: (key: string) => void;
  getApiErrorCode: (err: unknown) => string;
  onCreateCoverFileChange: (event: Event) => void;
  onCoverFileChange: (event: Event) => void;
  onAssetFileChange: (event: Event) => void;
  reloadFolders: () => Promise<void>;
  syncCategorySelection: () => void;
  syncFolderEditCategorySelection: () => void;
  reloadTaxonomy: () => Promise<void>;
  reloadFolderAssets: () => Promise<void>;
  reloadEmbedProfiles: () => Promise<void>;
  createFolderEntry: () => Promise<void>;
  saveFolderMeta: () => Promise<void>;
  uploadCover: () => Promise<void>;
  uploadAssetEntry: () => Promise<void>;
  switchAssetOpenMode: (asset: LibraryAsset, mode: LibraryOpenMode) => Promise<void>;
  runAssetBatchOpenMode: (mode: LibraryOpenMode) => Promise<void>;
  runAssetBatchMove: () => Promise<void>;
  runAssetBatchDelete: () => Promise<void>;
  runAssetBatchUndo: () => Promise<void>;
  restoreDeletedAsset: (assetId: string) => Promise<void>;
  removeDeletedAssetPermanently: (asset: LibraryAsset) => Promise<void>;
  startEditAsset: (asset: LibraryAsset) => void;
  saveAssetEdit: () => Promise<void>;
  createEmbedProfileEntry: () => Promise<void>;
  startEditEmbedProfile: (profile: LibraryEmbedProfile) => void;
  saveEmbedProfileEdit: () => Promise<void>;
  removeEmbedProfile: (profileId: string) => Promise<void>;
  syncEmbedProfileEntry: (profileId: string) => Promise<void>;
  renameAssetDisplayName: (asset: LibraryAsset) => Promise<void>;
  removeAsset: (assetId: string) => Promise<void>;
  removeFolder: (folderId: string) => Promise<void>;
};

type LibraryAdminStateInput = {
  ui: LibraryAdminUiState;
  data: LibraryAdminDataState;
  drafts: LibraryAdminDraftState;
  filters: LibraryAdminFilterState;
  selection: LibraryAdminSelectionState;
  panels: LibraryAdminPanelState;
  logs: LibraryAdminLogState;
  actions: LibraryAdminActionState;
};

type FacadeBuckets<T extends LibraryAdminStateInput> = {
  ui: T["ui"];
  data: T["data"];
  drafts: T["drafts"];
  filters: T["filters"];
  selection: T["selection"];
  panels: T["panels"];
  logs: T["logs"];
  actions: T["actions"];
};

export function createLibraryAdminStateFacade<T extends LibraryAdminStateInput>(state: T): FacadeBuckets<T> {
  return state;
}
