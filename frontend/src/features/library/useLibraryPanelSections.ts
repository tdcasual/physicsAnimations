import { ref } from "vue";
import type { LibraryPanelTab } from "./libraryAdminModels";

export function useLibraryPanelSections() {
  const activePanelTab = ref<LibraryPanelTab>("folder");
  const panelSections = ref<Record<string, boolean>>({
    "folder:meta": true,
    "folder:cover": true,
    "asset:upload": true,
    "asset:edit": true,
    "embed:create": true,
    "embed:list": true,
    "embed:edit": true,
    "recent:log": true,
  });

  function isPanelSectionOpen(key: string) {
    return panelSections.value[key] !== false;
  }

  function togglePanelSection(key: string) {
    panelSections.value[key] = !isPanelSectionOpen(key);
  }

  function ensurePanelSectionOpen(key: string) {
    panelSections.value[key] = true;
  }

  function setActivePanelTab(tab: LibraryPanelTab) {
    activePanelTab.value = tab;
    if (tab === "folder") ensurePanelSectionOpen("folder:meta");
    if (tab === "asset") ensurePanelSectionOpen("asset:upload");
    if (tab === "embed") ensurePanelSectionOpen("embed:create");
  }

  return {
    activePanelTab,
    panelSections,
    isPanelSectionOpen,
    togglePanelSection,
    ensurePanelSectionOpen,
    setActivePanelTab,
  };
}
