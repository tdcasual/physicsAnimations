import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { AssetSortMode } from "./libraryAdminModels";
import type { LibraryAsset, LibraryEmbedProfile, LibraryFolder, LibraryOpenMode } from "./types";

type UseLibraryAssetFiltersDeps = {
  folders: Ref<LibraryFolder[]>;
  folderAssets: Ref<LibraryAsset[]>;
  embedProfiles: Ref<LibraryEmbedProfile[]>;
  selectedFolder: ComputedRef<LibraryFolder | null>;
};

export function useLibraryAssetFilters(deps: UseLibraryAssetFiltersDeps) {
  const folderSearchQuery = ref("");
  const assetSearchQuery = ref("");
  const profileSearchQuery = ref("");
  const assetModeFilter = ref<"all" | LibraryOpenMode>("all");
  const assetEmbedProfileFilter = ref("all");
  const assetSortMode = ref<AssetSortMode>("updated_desc");

  const selectableEmbedProfiles = computed(() => deps.embedProfiles.value.filter((profile) => profile.enabled !== false));

  const selectedFolderAssetCount = computed(() => {
    if (!deps.selectedFolder.value) return 0;
    return Number(deps.selectedFolder.value.assetCount || deps.folderAssets.value.length || 0);
  });

  const filteredFolders = computed(() => {
    const query = folderSearchQuery.value.trim().toLowerCase();
    if (!query) return deps.folders.value;
    return deps.folders.value.filter((folder) => {
      const hay = `${folder.name || ""}\n${folder.categoryId || ""}\n${folder.id || ""}`.toLowerCase();
      return hay.includes(query);
    });
  });

  const filteredFolderAssets = computed(() => {
    const query = assetSearchQuery.value.trim().toLowerCase();
    return deps.folderAssets.value.filter((asset) => {
      if (assetModeFilter.value !== "all" && asset.openMode !== assetModeFilter.value) return false;
      if (assetEmbedProfileFilter.value === "none" && asset.embedProfileId) return false;
      if (
        assetEmbedProfileFilter.value !== "all" &&
        assetEmbedProfileFilter.value !== "none" &&
        asset.embedProfileId !== assetEmbedProfileFilter.value
      ) {
        return false;
      }
      if (!query) return true;
      const hay = `${asset.displayName || ""}\n${asset.fileName || ""}\n${asset.id || ""}\n${asset.embedProfileId || ""}`.toLowerCase();
      return hay.includes(query);
    });
  });

  const sortedFilteredFolderAssets = computed(() => {
    const list = filteredFolderAssets.value.slice();
    const safeText = (value: unknown) => String(value || "").toLowerCase();
    const toTime = (value: unknown) => {
      const n = new Date(String(value || "")).getTime();
      return Number.isFinite(n) ? n : 0;
    };

    list.sort((a, b) => {
      if (assetSortMode.value === "name_asc") {
        return safeText(a.displayName || a.fileName).localeCompare(safeText(b.displayName || b.fileName));
      }
      if (assetSortMode.value === "name_desc") {
        return safeText(b.displayName || b.fileName).localeCompare(safeText(a.displayName || a.fileName));
      }
      if (assetSortMode.value === "updated_asc") {
        return toTime(a.updatedAt || a.createdAt) - toTime(b.updatedAt || b.createdAt);
      }
      return toTime(b.updatedAt || b.createdAt) - toTime(a.updatedAt || a.createdAt);
    });

    return list;
  });

  const filteredEmbedProfiles = computed(() => {
    const query = profileSearchQuery.value.trim().toLowerCase();
    if (!query) return deps.embedProfiles.value;
    return deps.embedProfiles.value.filter((profile) => {
      const hay = `${profile.name || ""}\n${profile.id || ""}\n${profile.remoteScriptUrl || profile.scriptUrl || ""}`.toLowerCase();
      return hay.includes(query);
    });
  });

  return {
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
  };
}
