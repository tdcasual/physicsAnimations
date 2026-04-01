import { computed, ref } from "vue";
import type { LibraryAsset, LibraryEmbedProfile, LibraryFolder, LibraryOpenMode } from "./types";

export function useLibraryAdminDraftState() {
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
  const folderListLoadSeq = ref(0);
  const selectedFolder = computed(() => folders.value.find((folder) => folder.id === selectedFolderId.value) || null);
  const editingAsset = computed(() => folderAssets.value.find((asset) => asset.id === editingAssetId.value) || null);

  return {
    folders,
    selectedFolderId,
    folderAssets,
    deletedAssets,
    embedProfiles,
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
    folderAssetsLoadSeq,
    folderListLoadSeq,
    selectedFolder,
    editingAsset,
  };
}
