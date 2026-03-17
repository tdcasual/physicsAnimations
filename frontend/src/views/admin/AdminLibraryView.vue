<script setup lang="ts">
import { reactive, ref } from "vue";
import type { LibraryAsset } from "../../features/library/types";
import { useLibraryAdminState } from "../../features/library/useLibraryAdminState";
import { createAdminLibraryMobileInspectorFocus } from "./library/useAdminLibraryMobileInspectorFocus";
import AssetPanel from "./library/panels/AssetPanel.vue";
import EmbedPanel from "./library/panels/EmbedPanel.vue";
import EmbedProfileCreatePanel from "./library/panels/EmbedProfileCreatePanel.vue";
import EmbedProfileEditPanel from "./library/panels/EmbedProfileEditPanel.vue";
import FolderPanel from "./library/panels/FolderPanel.vue";
import OperationLogPanel from "./library/panels/OperationLogPanel.vue";

const vm = reactive(useLibraryAdminState());
const inspectorTopRef = ref<HTMLElement | null>(null);
const folderMetaSectionRef = ref<HTMLElement | null>(null);
const assetEditSectionRef = ref<HTMLElement | null>(null);
const { focusInspectorTarget } = createAdminLibraryMobileInspectorFocus({
  inspectorTopRef,
  folderMetaSectionRef,
  assetEditSectionRef,
});

async function openFolderEditor(folderId: string) {
  vm.actions.selectFolder(folderId, { panelTab: "folder" });
  if (vm.data.selectedFolderId !== folderId || vm.panels.activePanelTab !== "folder") return;
  await focusInspectorTarget("folder");
}

async function openAssetEditor(asset: LibraryAsset) {
  vm.actions.startEditAsset(asset);
  if (vm.drafts.editingAssetId !== asset.id || vm.panels.activePanelTab !== "asset") return;
  await focusInspectorTarget("asset");
}

function folderListEmptyText(): string {
  return vm.filters.folderSearchQuery.trim() ? "暂无匹配文件夹。" : "暂无文件夹。";
}

function selectedFolderAssetsEmptyText(): string {
  return vm.filters.assetSearchQuery.trim() || vm.filters.assetModeFilter !== "all" || vm.filters.assetEmbedProfileFilter !== "all"
    ? "该文件夹暂无匹配资源。"
    : "该文件夹暂无资源。";
}

function embedProfilesEmptyText(): string {
  return vm.filters.profileSearchQuery.trim() ? "暂无匹配 Embed 平台。" : "暂无 Embed 平台。";
}
</script>

<template src="./library/AdminLibraryView.template.html"></template>

<style scoped src="./library/AdminLibraryView.css"></style>
