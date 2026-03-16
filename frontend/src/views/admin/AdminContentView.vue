<script setup lang="ts">
import { reactive, ref } from "vue";
import type { AdminItemRow } from "../../features/admin/adminApi";
import { useContentAdmin } from "../../features/admin/content/useContentAdmin";
import { createAdminMobileEditPanelFocus } from "./useAdminMobileEditPanelFocus";
import ContentCreateForm from "./content/ContentCreateForm.vue";
import ContentEditPanel from "./content/ContentEditPanel.vue";
import ContentListPanel from "./content/ContentListPanel.vue";

const vm = reactive(useContentAdmin());
const contentEditorPanelRef = ref<HTMLElement | null>(null);
const { focusEditPanel: focusContentEditPanel } = createAdminMobileEditPanelFocus({
  panelRef: contentEditorPanelRef,
  maxWidth: 1024,
});

async function openContentEditor(item: AdminItemRow) {
  vm.beginEdit(item);
  if (vm.editingId !== item.id) return;
  await focusContentEditPanel();
}
</script>

<template>
  <section class="admin-content-view">
    <header class="admin-page-header admin-page-header--content">
      <div class="admin-page-copy">
        <p class="admin-page-kicker">内容编修</p>
        <h2>内容管理</h2>
        <p class="admin-page-intro admin-page-intro--supporting">整理目录入口所需的标题与状态。</p>
      </div>
      <div class="admin-page-meta">
        <span class="admin-page-meta-label">当前节奏</span>
        <strong>{{ vm.editingId ? "编辑详情已展开" : "先补新条目" }}</strong>
        <span class="admin-page-meta-copy">
          {{ vm.editingId ? "右侧面板保持聚焦，适合连续修订标题与排序。" : "先创建或筛选条目，再在右侧完成发布设定。" }}
        </span>
      </div>
    </header>

    <div class="admin-workspace-grid">
      <div class="list-panel admin-card">
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
      </div>

      <aside ref="contentEditorPanelRef" class="editor-panel admin-card admin-mobile-focus-anchor">
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
.admin-content-view {
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
  font-size: 16px;
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
  font-size: 12px;
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
  font-size: 13px;
  color: var(--muted);
}

.action-feedback.error {
  color: var(--danger);
}

.action-feedback.success {
  color: #15803d;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.error-text {
  color: var(--danger);
  font-size: 13px;
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
  font-size: 12px;
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  :deep(.list-header) {
    gap: 6px;
  }

  :deep(.list-heading) {
    display: none;
  }
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
