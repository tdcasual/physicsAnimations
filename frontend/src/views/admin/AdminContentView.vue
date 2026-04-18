<script setup lang="ts">
import { computed, ref } from "vue";

import type { AdminItemRow } from "../../features/admin/adminApi";
import { useContentAdmin } from "../../features/admin/content/useContentAdmin";

import ContentCreateForm from "./content/ContentCreateForm.vue";
import ContentEditPanel from "./content/ContentEditPanel.vue";
import ContentListPanel from "./content/ContentListPanel.vue";
import { createAdminMobileEditPanelFocus } from "./useAdminMobileEditPanelFocus";

import AdminSplitLayout from "@/components/admin/AdminSplitLayout.vue";
import { PACard } from "@/components/ui/patterns";

const vm = useContentAdmin();
const mobileEditorSheetMaxWidth = 640;
const isEditorSheetOpen = computed(() => Boolean(vm.selectedItem));
const contentSplitLayoutRef = ref<{ panelRef: HTMLElement | null } | null>(null);
const contentEditorPanelRef = computed(() => contentSplitLayoutRef.value?.panelRef ?? null);
const { focusEditPanel: focusContentEditPanel } = createAdminMobileEditPanelFocus({
  panelRef: contentEditorPanelRef,
  maxWidth: 1024,
});

function isMobileEditorSheetViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(`(max-width: ${mobileEditorSheetMaxWidth}px)`).matches;
}

async function openContentEditor(item: AdminItemRow) {
  vm.beginEdit(item);
  if (vm.editingId !== item.id) return;
  if (isMobileEditorSheetViewport()) return;
  await focusContentEditPanel();
}


</script>

<template>
  <AdminSplitLayout
    ref="contentSplitLayoutRef"
    :editor-open="isEditorSheetOpen"
    editor-title="关闭编辑抽屉"
    @close-editor="vm.resetEdit"
  >
    <template #header>
      <header class="admin-page-header admin-page-header--content">
        <div class="admin-page-copy">
          <p class="admin-page-kicker">内容编修</p>
          <h2>内容管理</h2>
        </div>
        <div class="admin-page-meta">
          <span class="admin-page-meta-label">当前节奏</span>
          <strong>{{ vm.editingId ? "编辑中" : "待创建" }}</strong>
        </div>
      </header>
    </template>

    <template #list>
      <PACard variant="admin" class="list-panel">
        <ContentCreateForm
          :grouped-category-options="vm.groupedCategoryOptions"
          :link-category-id="vm.linkCategoryId"
          :link-url="vm.linkUrl"
          :link-title="vm.linkTitle"
          :link-description="vm.linkDescription"
          :saving="vm.saving"
          :create-link-url-error="vm.getFieldError('createLinkUrl')"
          @update:link-category-id="vm.linkCategoryId = $event"
          @update:link-url="vm.linkUrl = $event"
          @update:link-title="vm.linkTitle = $event"
          @update:link-description="vm.linkDescription = $event"
          @clear-link-url-error="vm.clearFieldErrors('createLinkUrl')"
          @submit="vm.submitLink"
        />

        <ContentListPanel
          :items="vm.items"
          :editing-id="vm.editingId"
          :loading="vm.loading"
          :error-text="vm.errorText"
          :total="vm.total"
          :has-more="vm.hasMore"
          :query="vm.query"
          :preview-href="vm.previewHref"
          :saving="vm.saving"
          @update:query="vm.query = $event"
          @begin-edit="openContentEditor"
          @remove-item="vm.removeItem"
          @load-more="vm.reloadItems({ reset: false })"
        />
      </PACard>
    </template>

    <template #editor>
      <ContentEditPanel
        :selected-item="vm.selectedItem"
        :action-feedback="vm.actionFeedback"
        :action-feedback-error="vm.actionFeedbackError"
        :grouped-category-options="vm.groupedCategoryOptions"
        :edit-title-error="vm.getFieldError('editTitle')"
        :edit-title="vm.editTitle"
        :edit-description="vm.editDescription"
        :edit-category-id="vm.editCategoryId"
        :edit-order="vm.editOrder"
        :edit-published="vm.editPublished"
        :edit-hidden="vm.editHidden"
        :saving="vm.saving"
        :show-sheet-close="Boolean(vm.selectedItem)"
        @update:edit-title="
          vm.editTitle = $event;
          vm.clearFieldErrors('editTitle');
        "
        @update:edit-description="vm.editDescription = $event"
        @update:edit-category-id="vm.editCategoryId = $event"
        @update:edit-order="vm.editOrder = $event"
        @update:edit-published="vm.editPublished = $event"
        @update:edit-hidden="vm.editHidden = $event"
        @reset-edit="vm.resetEdit"
        @close-edit="vm.resetEdit"
        @save-edit="vm.saveEdit"
      />
    </template>
  </AdminSplitLayout>
</template>

<style scoped>
.list-panel {
  align-content: start;
}
</style>
