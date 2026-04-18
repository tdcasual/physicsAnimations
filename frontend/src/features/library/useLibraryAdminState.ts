import { computed, reactive, ref } from "vue";

import { buildLibraryAdminFacadeInput } from "./buildLibraryAdminFacadeInput";
import { createJsonObjectInputParser } from "./createJsonObjectInputParser";
import { useLibraryAdminActionWiring } from "./useLibraryAdminActionWiring";
import { useLibraryAdminDraftState } from "./useLibraryAdminDraftState";
import { useLibraryAdminFeedback } from "./useLibraryAdminFeedback";
import { createLibraryAdminStateFacade } from "./useLibraryAdminStateFacade";
import { useLibraryAssetFilters } from "./useLibraryAssetFilters";
import { useLibraryPanelSections } from "./useLibraryPanelSections";

export function useLibraryAdminState() {
  const loading = ref(false);
  const savingFolder = ref(false);
  const savingAsset = ref(false);
  const savingEmbed = ref(false);
  const saving = computed(() => savingFolder.value || savingAsset.value || savingEmbed.value);

  const feedbackState = useLibraryAdminFeedback();
  const draftState = useLibraryAdminDraftState();
  const assetFilters = useLibraryAssetFilters({
    folders: draftState.folders,
    folderAssets: draftState.folderAssets,
    embedProfiles: draftState.embedProfiles,
    selectedFolder: draftState.selectedFolder,
  });
  const panelState = useLibraryPanelSections();

  const parseJsonObjectInput = createJsonObjectInputParser({
    setFeedback: feedbackState.setFeedback,
    setFieldError: feedbackState.setFieldError,
  });

  const actionWiring = useLibraryAdminActionWiring({
    loading,
    savingFolder,
    savingAsset,
    savingEmbed,
    feedback: feedbackState,
    draft: draftState,
    filters: assetFilters,
    panels: panelState,
    parseJsonObjectInput,
  });

  const facadeInput = buildLibraryAdminFacadeInput({
    loading,
    saving,
    savingFolder,
    savingAsset,
    savingEmbed,
    feedback: feedbackState,
    draft: draftState,
    filters: assetFilters,
    panels: panelState,
    actions: actionWiring,
    parseJsonObjectInput,
  });

  return reactive(createLibraryAdminStateFacade(facadeInput));
}
