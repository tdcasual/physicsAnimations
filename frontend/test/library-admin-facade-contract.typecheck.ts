import type { ComputedRef, Ref } from "vue";
import { createLibraryAdminStateFacade } from "../src/features/library/useLibraryAdminStateFacade";
import type {
  AssetBatchResult,
  AssetSortMode,
  CategoryRow,
  GroupRow,
  JsonObjectParseResult,
  LibraryPanelTab,
  OperationLogEntry,
  OperationLogLevel,
} from "../src/features/library/libraryAdminModels";
import type { LibraryAsset, LibraryEmbedProfile, LibraryFolder, LibraryOpenMode } from "../src/features/library/types";

type Assert<T extends true> = T;
type IsEqual<A, B> = (
  <T>() => T extends A ? 1 : 2
) extends (
  <T>() => T extends B ? 1 : 2
)
  ? (
      <T>() => T extends B ? 1 : 2
    ) extends (
      <T>() => T extends A ? 1 : 2
    )
    ? true
    : false
  : false;

type Input = Parameters<typeof createLibraryAdminStateFacade>[0];

type _inputLoading = Assert<IsEqual<Input["loading"], Ref<boolean>>>;
type _inputSaving = Assert<IsEqual<Input["saving"], ComputedRef<boolean>>>;
type _inputFeedback = Assert<IsEqual<Input["feedback"], Ref<string>>>;
type _inputFieldErrors = Assert<IsEqual<Input["fieldErrors"], Ref<Record<string, string>>>>;

type _inputFolders = Assert<IsEqual<Input["folders"], Ref<LibraryFolder[]>>>;
type _inputFolderAssets = Assert<IsEqual<Input["folderAssets"], Ref<LibraryAsset[]>>>;
type _inputEmbedProfiles = Assert<IsEqual<Input["embedProfiles"], Ref<LibraryEmbedProfile[]>>>;
type _inputCategories = Assert<IsEqual<Input["categories"], Ref<CategoryRow[]>>>;
type _inputGroups = Assert<IsEqual<Input["groups"], Ref<GroupRow[]>>>;
type _inputModeFilter = Assert<IsEqual<Input["assetModeFilter"], Ref<"all" | LibraryOpenMode>>>;
type _inputSortMode = Assert<IsEqual<Input["assetSortMode"], Ref<AssetSortMode>>>;

type _inputAssetFile = Assert<IsEqual<Input["assetFile"], Ref<File | null>>>;
type _inputOpenMode = Assert<IsEqual<Input["openMode"], Ref<LibraryOpenMode>>>;
type _inputParserMode = Assert<IsEqual<Input["assetParserMode"], Ref<"auto" | "profile">>>;
type _inputEditParserMode = Assert<IsEqual<Input["assetEditParserMode"], Ref<"auto" | "profile">>>;
type _inputEmbedEnabled = Assert<IsEqual<Input["embedEnabled"], Ref<boolean>>>;

type _inputParseJson = Assert<
  IsEqual<Input["parseJsonObjectInput"], (raw: string, fieldLabel: string, fieldKey?: string) => JsonObjectParseResult>
>;
type _inputSetFeedback = Assert<IsEqual<Input["setFeedback"], (text: string, isError?: boolean) => void>>;
type _inputSetActiveTab = Assert<IsEqual<Input["setActivePanelTab"], (tab: LibraryPanelTab) => void>>;
type _inputBatchOpen = Assert<IsEqual<Input["runAssetBatchOpenMode"], (mode: LibraryOpenMode) => Promise<void>>>;
type _inputStartEditAsset = Assert<IsEqual<Input["startEditAsset"], (asset: LibraryAsset) => void>>;
type _inputStartEditProfile = Assert<IsEqual<Input["startEditEmbedProfile"], (profile: LibraryEmbedProfile) => void>>;
type _inputSyncProfile = Assert<IsEqual<Input["syncEmbedProfileEntry"], (profileId: string) => Promise<void>>>;
type _inputRemoveAsset = Assert<IsEqual<Input["removeAsset"], (assetId: string) => Promise<void>>>;
type _inputRemoveFolder = Assert<IsEqual<Input["removeFolder"], (folderId: string) => Promise<void>>>;
type _inputApiErrorBoundary = Assert<IsEqual<Input["getApiErrorCode"], (err: unknown) => string>>;

declare const input: Input;
const facade = createLibraryAdminStateFacade(input);

type _facadeTopKeys = Assert<IsEqual<keyof typeof facade, "ui" | "data" | "drafts" | "filters" | "selection" | "panels" | "logs" | "actions">>;
type _facadeUiLoading = Assert<IsEqual<typeof facade.ui.loading, Ref<boolean>>>;
type _facadeDataFolders = Assert<IsEqual<typeof facade.data.folders, Ref<LibraryFolder[]>>>;
type _facadeDraftFile = Assert<IsEqual<typeof facade.drafts.assetFile, Ref<File | null>>>;
type _facadeFilterSort = Assert<IsEqual<typeof facade.filters.assetSortMode, Ref<AssetSortMode>>>;
type _facadeSelectionCount = Assert<IsEqual<typeof facade.selection.selectedAssetCount, ComputedRef<number>>>;
type _facadePanelTab = Assert<IsEqual<typeof facade.panels.activePanelTab, Ref<LibraryPanelTab>>>;
type _facadeLogItems = Assert<IsEqual<typeof facade.logs.operationLogs, Ref<OperationLogEntry[]>>>;
type _facadeLogPush = Assert<IsEqual<typeof facade.logs.pushOperationLog, (message: string, level?: OperationLogLevel) => void>>;
type _facadeActionParse = Assert<
  IsEqual<typeof facade.actions.parseJsonObjectInput, (raw: string, fieldLabel: string, fieldKey?: string) => JsonObjectParseResult>
>;
type _facadeActionSetFeedback = Assert<IsEqual<typeof facade.actions.setFeedback, (text: string, isError?: boolean) => void>>;
type _facadeActionSetTab = Assert<IsEqual<typeof facade.actions.setActivePanelTab, (tab: LibraryPanelTab) => void>>;
type _facadeActionBatchOpen = Assert<IsEqual<typeof facade.actions.runAssetBatchOpenMode, (mode: LibraryOpenMode) => Promise<void>>>;
type _facadeActionRemoveAsset = Assert<IsEqual<typeof facade.actions.removeAsset, (assetId: string) => Promise<void>>>;
type _facadeActionRemoveFolder = Assert<IsEqual<typeof facade.actions.removeFolder, (folderId: string) => Promise<void>>>;
