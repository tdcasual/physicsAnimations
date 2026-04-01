import { listLibraryEmbedProfiles } from "./libraryApi";
import type { UseLibraryEmbedProfileActionsDeps } from "./embedProfile/embedProfileActionDeps";
import { useEmbedProfileCreateActions } from "./embedProfile/useEmbedProfileCreateActions";
import { useEmbedProfileEditActions } from "./embedProfile/useEmbedProfileEditActions";
import { useEmbedProfileSyncActions } from "./embedProfile/useEmbedProfileSyncActions";

export function useLibraryEmbedProfileActions(deps: UseLibraryEmbedProfileActionsDeps) {
  function cancelEmbedProfileEdit() {
    deps.editingEmbedProfileId.value = "";
    deps.embedEditName.value = "";
    deps.embedEditScriptUrl.value = "";
    deps.embedEditFallbackScriptUrl.value = "";
    deps.embedEditViewerPath.value = "";
    deps.embedEditConstructorName.value = "ElectricFieldApp";
    deps.embedEditAssetUrlOptionKey.value = "sceneUrl";
    deps.embedEditExtensionsText.value = "";
    deps.embedEditDefaultOptionsJson.value = "{}";
    deps.embedEditEnabled.value = true;
    deps.clearFieldErrors("editEmbedProfileName", "editEmbedScriptUrl", "editEmbedDefaultOptionsJson");
  }

  async function reloadEmbedProfiles() {
    const list = await listLibraryEmbedProfiles();
    deps.embedProfiles.value = list;

    if (!deps.assetEmbedProfileId.value || !list.some((profile) => profile.id === deps.assetEmbedProfileId.value && profile.enabled !== false)) {
      deps.assetEmbedProfileId.value = list.find((profile) => profile.enabled !== false)?.id || "";
    }

    if (
      deps.assetEditParserMode.value === "profile" &&
      (!deps.assetEditEmbedProfileId.value || !list.some((profile) => profile.id === deps.assetEditEmbedProfileId.value && profile.enabled !== false))
    ) {
      deps.assetEditEmbedProfileId.value = list.find((profile) => profile.enabled !== false)?.id || "";
    }

    if (deps.editingEmbedProfileId.value && !list.some((profile) => profile.id === deps.editingEmbedProfileId.value)) {
      cancelEmbedProfileEdit();
    }
  }

  const createActions = useEmbedProfileCreateActions({ deps, reloadEmbedProfiles });
  const editActions = useEmbedProfileEditActions({
    deps,
    reloadEmbedProfiles,
    cancelEmbedProfileEdit,
  });
  const syncActions = useEmbedProfileSyncActions({ deps, reloadEmbedProfiles });

  return {
    cancelEmbedProfileEdit,
    reloadEmbedProfiles,
    ...createActions,
    ...editActions,
    ...syncActions,
  };
}
