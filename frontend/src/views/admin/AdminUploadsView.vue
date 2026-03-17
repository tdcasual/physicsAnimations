<script setup lang="ts">
import { reactive, ref } from "vue";
import type { AdminItemRow } from "../../features/admin/adminApi";
import { useUploadAdmin } from "../../features/admin/uploads/useUploadAdmin";
import { createAdminMobileEditPanelFocus } from "./useAdminMobileEditPanelFocus";
import UploadsCreateForm from "./uploads/UploadsCreateForm.vue";
import UploadsEditPanel from "./uploads/UploadsEditPanel.vue";
import UploadsListPanel from "./uploads/UploadsListPanel.vue";

const vm = reactive(useUploadAdmin());
const uploadEditorPanelRef = ref<HTMLElement | null>(null);
const { focusEditPanel: focusUploadEditPanel } = createAdminMobileEditPanelFocus({
  panelRef: uploadEditorPanelRef,
  maxWidth: 1024,
});

async function openUploadEditor(item: AdminItemRow) {
  vm.beginEdit(item);
  if (vm.editingId !== item.id) return;
  await focusUploadEditPanel();
}
</script>

<template>
  <section class="admin-uploads-view">
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

    <div class="admin-workspace-grid">
      <div class="list-panel admin-card">
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
      </div>

      <aside ref="uploadEditorPanelRef" class="editor-panel admin-card admin-mobile-focus-anchor">
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
          @save-edit="vm.saveEdit"
        />
      </aside>
    </div>
  </section>
</template>

<style scoped>
.admin-uploads-view {
  display: grid;
  gap: 14px;
}

.list-panel,
.editor-panel {
  align-content: start;
}

.editor-panel {
  position: sticky;
  align-self: start;
  top: calc(var(--app-topbar-height, 0px) + 12px);
  max-height: calc(100dvh - var(--app-topbar-height, 0px) - 32px);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.admin-mobile-focus-anchor {
  scroll-margin-top: calc(var(--app-topbar-height, 0px) + 16px);
}

h3 {
  margin: 0;
  font-size: calc(16px * var(--ui-scale));
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

:deep(.list-divider) {
  border-top: 1px dashed var(--border);
}

:deep(.list-header) {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

:deep(.list-search) {
  width: min(360px, 100%);
}

:deep(.item-card) {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 10px;
  background: color-mix(in srgb, var(--surface) 90%, var(--bg));
}

:deep(.item-card.selected) {
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
  background: color-mix(in srgb, var(--primary) 9%, var(--surface));
}

:deep(.item-head) {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

:deep(.item-title) {
  font-weight: 600;
  overflow-wrap: anywhere;
  word-break: break-word;
}

:deep(.item-meta) {
  color: var(--muted);
  font-size: calc(12px * var(--ui-scale));
  overflow-wrap: anywhere;
  word-break: break-word;
}

:deep(.item-actions) {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
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
  color: var(--danger);
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
  color: var(--danger);
  font-size: calc(13px * var(--ui-scale));
}

:deep(.empty) {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 16px;
  color: var(--muted);
}

:deep(.list-footer) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

:deep(.meta) {
  color: var(--muted);
  font-size: calc(12px * var(--ui-scale));
  overflow-wrap: anywhere;
}

@media (max-width: 1024px) {
  .editor-panel {
    position: static;
    top: auto;
    max-height: none;
    overflow: visible;
  }
}

@media (max-width: 640px) {
  :deep(.list-header) {
    gap: 6px;
  }

  :deep(.list-heading) {
    display: none;
  }
}
</style>
