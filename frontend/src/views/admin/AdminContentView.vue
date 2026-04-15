<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import type { AdminItemRow } from "../../features/admin/adminApi";
import { useContentAdmin } from "../../features/admin/content/useContentAdmin";
import { createAdminMobileEditPanelFocus } from "./useAdminMobileEditPanelFocus";
import ContentCreateForm from "./content/ContentCreateForm.vue";
import ContentEditPanel from "./content/ContentEditPanel.vue";
import { PACard } from "@/components/ui/patterns";
import ContentListPanel from "./content/ContentListPanel.vue";

const vm = reactive(useContentAdmin());
const contentEditorPanelRef = ref<HTMLElement | null>(null);
const mobileEditorSheetMaxWidth = 640;
const isEditorSheetOpen = computed(() => Boolean(vm.selectedItem));
const { focusEditPanel: focusContentEditPanel } = createAdminMobileEditPanelFocus({
  panelRef: contentEditorPanelRef,
  maxWidth: 1024,
});
let bodyOverflowBeforeEditorSheet = "";

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

watch(isEditorSheetOpen, (open) => {
  if (open && isMobileEditorSheetViewport()) {
    bodyOverflowBeforeEditorSheet = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return;
  }

  document.body.style.overflow = bodyOverflowBeforeEditorSheet;
  bodyOverflowBeforeEditorSheet = "";
});

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflowBeforeEditorSheet;
});
</script>

<template>
  <section class="admin-content-view">
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

    <div class="admin-workspace-grid">
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

      <button
        v-if="vm.selectedItem"
        type="button"
        class="editor-sheet-backdrop"
        aria-label="关闭编辑抽屉"
        @click="vm.resetEdit"
      />

      <PACard
        variant="admin"
        as="aside"
        ref="contentEditorPanelRef"
        :class="['editor-panel', 'editor-panel--sheet', 'admin-mobile-focus-anchor', { 'is-open': isEditorSheetOpen }]"
      >
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
      </PACard>
    </div>
  </section>
</template>

<style scoped>
.admin-content-view {
  display: grid;
  gap: 20px;
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

.editor-sheet-backdrop {
  display: none;
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

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.editor-form {
  display: grid;
  gap: 16px;
}

.editor-footer {
  display: grid;
  gap: 12px;
}

.action-feedback {
  font-size: 13px;
  color: var(--muted-foreground);
}

.action-feedback.error {
  color: var(--destructive);
}

.action-feedback.success {
  color: var(--primary);
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.error-text {
  color: var(--destructive);
  font-size: 14px;
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
  .admin-content-view {
    gap: 16px;
  }

  .editor-sheet-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-modal) - 2);
    border: 0;
    padding: 0;
    background: rgb(0 0 0 / 0.4);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .editor-panel--sheet {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: 0;
    top: auto;
    z-index: calc(var(--z-modal) - 1);
    max-height: min(78dvh, 720px);
    overflow: auto;
    border-radius: 24px 24px 0 0;
    box-shadow: 0 -20px 48px -20px rgb(0 0 0 / 0.2);
    transform: translateY(calc(100% + 20px));
    transition: transform 200ms ease;
    pointer-events: none;
  }

  .editor-panel--sheet.is-open {
    transform: translateY(0);
    pointer-events: auto;
  }
}
</style>
