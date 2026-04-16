<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { AdminItemRow } from "../../features/admin/adminApi";
import { useUploadAdmin } from "../../features/admin/uploads/useUploadAdmin";
import { createAdminMobileEditPanelFocus } from "./useAdminMobileEditPanelFocus";
import UploadsCreateForm from "./uploads/UploadsCreateForm.vue";
import UploadsEditPanel from "./uploads/UploadsEditPanel.vue";
import { PACard } from "@/components/ui/patterns";
import UploadsListPanel from "./uploads/UploadsListPanel.vue";
import AdminSplitLayout from "@/components/admin/AdminSplitLayout.vue";

const vm = reactive(useUploadAdmin());
const mobileEditorSheetMaxWidth = 640;
const isEditorSheetOpen = computed(() => Boolean(vm.selectedItem));
const uploadSplitLayoutRef = ref<{ panelRef: HTMLElement | null } | null>(null);
const uploadEditorPanelRef = computed(() => uploadSplitLayoutRef.value?.panelRef ?? null);
const { focusEditPanel: focusUploadEditPanel } = createAdminMobileEditPanelFocus({
  panelRef: uploadEditorPanelRef,
  maxWidth: 1024,
});

function isMobileEditorSheetViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(`(max-width: ${mobileEditorSheetMaxWidth}px)`).matches;
}

async function openUploadEditor(item: AdminItemRow) {
  vm.beginEdit(item);
  if (vm.editingId !== item.id) return;
  if (isMobileEditorSheetViewport()) return;
  await focusUploadEditPanel();
}


</script>

<template>
  <AdminSplitLayout
    ref="uploadSplitLayoutRef"
    :editor-open="isEditorSheetOpen"
    gap="14px"
    editor-title="关闭编辑抽屉"
    @close-editor="vm.resetEdit"
  >
    <template #header>
      <header class="admin-page-header admin-page-header--uploads">
        <div class="admin-page-copy">
          <p class="admin-page-kicker">资源归档</p>
          <h2>上传管理</h2>
        </div>
        <div class="admin-page-meta">
          <span class="admin-page-meta-label">当前节奏</span>
          <strong>{{ vm.editingId ? "编辑中" : "待上传" }}</strong>
        </div>
      </header>
    </template>

    <template #list>
      <PACard variant="admin" class="list-panel">
        <UploadsCreateForm
          :category-options="vm.categoryOptions"
          :category-id="vm.categoryId"
          :title="vm.title"
          :description="vm.description"
          :saving="vm.saving"
          :upload-file-error="vm.getFieldError('uploadFile')"
          @update:category-id="vm.categoryId = $event"
          @file-change="vm.onSelectFile"
          @update:title="vm.title = $event"
          @update:description="vm.description = $event"
          @submit="vm.submitUpload"
        />

        <UploadsListPanel
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
          @begin-edit="openUploadEditor"
          @remove-item="vm.removeItem"
          @load-more="vm.reloadUploads({ reset: false })"
        />
      </PACard>
    </template>

    <template #editor>
      <UploadsEditPanel
        :selected-item="vm.selectedItem"
        :action-feedback="vm.actionFeedback"
        :action-feedback-error="vm.actionFeedbackError"
        :category-options="vm.categoryOptions"
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

.field-textarea {
  min-height: 72px;
  resize: vertical;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.editor-form {
  display: grid;
  gap: 10px;
}

.editor-footer {
  display: grid;
  gap: 8px;
}

.action-feedback {
  font-size: calc(13px * var(--ui-scale));
  color: var(--muted);
}

.action-feedback.error {
  color: var(--destructive);
}

.action-feedback.success {
  color: var(--success);
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: calc(13px * var(--ui-scale));
}

.error-text {
  color: var(--destructive);
  font-size: calc(13px * var(--ui-scale));
}

@media (max-width: 1024px) {
  .editor-panel {
    position: static;
    top: auto;
    max-height: none;
    overflow: visible;
  }
}
</style>
