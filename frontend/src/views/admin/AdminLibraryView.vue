<script setup lang="ts">
import { reactive } from "vue";
import { useLibraryAdminState } from "../../features/library/useLibraryAdminState";
import LibraryAssetColumn from "./library/LibraryAssetColumn.vue";
import LibraryFolderColumn from "./library/LibraryFolderColumn.vue";
import LibraryInspectorColumn from "./library/LibraryInspectorColumn.vue";
import AssetPanel from "./library/panels/AssetPanel.vue";
import EmbedPanel from "./library/panels/EmbedPanel.vue";
import EmbedProfileCreatePanel from "./library/panels/EmbedProfileCreatePanel.vue";
import EmbedProfileEditPanel from "./library/panels/EmbedProfileEditPanel.vue";
import FolderPanel from "./library/panels/FolderPanel.vue";
import OperationLogPanel from "./library/panels/OperationLogPanel.vue";

const vm = reactive(useLibraryAdminState());
</script>

<template src="./library/AdminLibraryView.template.html"></template>

<style scoped src="./library/AdminLibraryView.css"></style>
