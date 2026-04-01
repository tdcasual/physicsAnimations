import { onMounted, watch, type ComputedRef, type Ref } from "vue";

type SelectableProfile = { id: string };

type UseLibraryAdminLifecycleDeps = {
  loading: Ref<boolean>;
  assetParserMode: Ref<"auto" | "profile">;
  assetEmbedProfileId: Ref<string>;
  assetEmbedOptionsJson: Ref<string>;
  assetEditParserMode: Ref<"auto" | "profile">;
  assetEditEmbedProfileId: Ref<string>;
  assetEditEmbedOptionsJson: Ref<string>;
  selectableEmbedProfiles: ComputedRef<SelectableProfile[]>;
  clearFieldErrors: (...keys: string[]) => void;
  reloadTaxonomy: () => Promise<void>;
  reloadEmbedProfiles: () => Promise<void>;
  reloadFolders: () => Promise<void>;
  reloadFolderAssets: () => Promise<void>;
  setFeedback: (message: string, isError?: boolean) => void;
};

export function useLibraryAdminLifecycle(deps: UseLibraryAdminLifecycleDeps) {
  watch(deps.assetParserMode, (mode) => {
    if (mode !== "profile") {
      deps.assetEmbedProfileId.value = "";
      deps.assetEmbedOptionsJson.value = "";
      deps.clearFieldErrors("uploadAssetEmbedProfile", "uploadAssetEmbedOptionsJson");
      return;
    }
    if (!deps.assetEmbedProfileId.value) {
      deps.assetEmbedProfileId.value = deps.selectableEmbedProfiles.value[0]?.id || "";
    }
  });

  watch(deps.assetEditParserMode, (mode) => {
    if (mode !== "profile") {
      deps.assetEditEmbedProfileId.value = "";
      deps.assetEditEmbedOptionsJson.value = "{}";
      deps.clearFieldErrors("editAssetEmbedProfile", "editAssetEmbedOptionsJson");
      return;
    }
    if (!deps.assetEditEmbedProfileId.value) {
      deps.assetEditEmbedProfileId.value = deps.selectableEmbedProfiles.value[0]?.id || "";
    }
  });

  onMounted(async () => {
    deps.loading.value = true;
    deps.setFeedback("");
    try {
      await deps.reloadTaxonomy().catch(() => {});
      await deps.reloadEmbedProfiles().catch(() => {});
      await deps.reloadFolders();
      await deps.reloadFolderAssets();
    } catch {
      deps.setFeedback("加载资源库管理数据失败。", true);
    } finally {
      deps.loading.value = false;
    }
  });
}
