<script setup lang="ts">
import { reactive } from "vue";
import ContentCreateForm from "./content/ContentCreateForm.vue";
import ContentEditPanel from "./content/ContentEditPanel.vue";
import ContentListPanel from "./content/ContentListPanel.vue";
import { useContentAdmin } from "../../features/admin/content/useContentAdmin";

const vm = reactive(useContentAdmin());
</script>

<template>
  <section class="admin-content-view">
    <h2>内容管理</h2>

    <div class="workspace-grid">
      <div class="admin-panel list-panel admin-card">
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
          @begin-edit="vm.beginEdit"
          @remove-item="vm.removeItem"
          @restore-item="vm.restoreItem"
          @load-more="vm.reloadItems({ reset: false })"
        />
      </div>

      <aside class="admin-panel editor-panel admin-card">
        <ContentEditPanel
          :selected-item="vm.selectedItem"
          :action-feedback="vm.actionFeedback"
          :action-feedback-error="vm.actionFeedbackError"
          :grouped-category-options="vm.groupedCategoryOptions"
          :edit-title="vm.editTitle"
          :edit-description="vm.editDescription"
          :edit-category-id="vm.editCategoryId"
          :edit-order="vm.editOrder"
          :edit-published="vm.editPublished"
          :edit-hidden="vm.editHidden"
          :saving="vm.saving"
          @update:edit-title="vm.editTitle = $event"
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

h2 {
  margin: 0;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 12px;
}

.admin-panel {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 10px;
}

.list-panel,
.editor-panel {
  align-content: start;
}

.editor-panel {
  position: sticky;
  top: 80px;
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

.list-divider {
  border-top: 1px dashed var(--border);
}

.list-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.list-search {
  width: min(360px, 100%);
}

.item-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 10px;
  background: color-mix(in srgb, var(--surface) 90%, var(--bg));
}

.item-card.selected {
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
  background: color-mix(in srgb, var(--primary) 9%, var(--surface));
}

.item-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.item-title {
  font-weight: 600;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.item-meta {
  color: var(--muted);
  font-size: 12px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.item-actions {
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

.empty {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 16px;
  color: var(--muted);
}

.list-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta {
  color: var(--muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}

@media (max-width: 1024px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .editor-panel {
    position: static;
  }
}
</style>
