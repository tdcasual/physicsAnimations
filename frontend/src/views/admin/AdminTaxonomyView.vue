<script setup lang="ts">
import { ref } from "vue";
import { useTaxonomyAdmin } from "../../features/admin/taxonomy/useTaxonomyAdmin";
import { createAdminTaxonomyMobileEditorFocus } from "./taxonomy/useAdminTaxonomyMobileEditorFocus";
import CategoryEditorPanel from "./taxonomy/CategoryEditorPanel.vue";
import GroupEditorPanel from "./taxonomy/GroupEditorPanel.vue";
import TaxonomyTreePanel from "./taxonomy/TaxonomyTreePanel.vue";

const taxonomy = useTaxonomyAdmin();
const editorTopRef = ref<HTMLElement | null>(null);
const groupEditorRef = ref<HTMLElement | null>(null);
const categoryEditorRef = ref<HTMLElement | null>(null);
const { focusEditorTarget } = createAdminTaxonomyMobileEditorFocus({
  editorTopRef,
  groupEditorRef,
  categoryEditorRef,
});

const {
  DEFAULT_GROUP_ID,
  errorText,
  loading,
  searchQuery,
  showHidden,
  tree,
  selection,
  taxonomyMetaText,
  selectedGroup,
  selectedCategory,
  allSortedGroups,
  canDeleteSelectedCategory,
  saving,
  actionFeedback,
  actionFeedbackError,
  createGroupId,
  createGroupTitle,
  createGroupOrder,
  createGroupHidden,
  groupFormTitle,
  groupFormOrder,
  groupFormHidden,
  createCategoryId,
  createCategoryTitle,
  createCategoryOrder,
  createCategoryHidden,
  categoryFormGroupId,
  categoryFormTitle,
  categoryFormOrder,
  categoryFormHidden,
  isGroupOpen,
  groupMetaText,
  categoryMetaText,
  onToggleGroup,
  collapseAll,
  expandAll,
  selectGroup,
  selectCategory,
  resetCreateGroupForm,
  createGroupEntry,
  saveGroup,
  resetOrDeleteGroup,
  resetCreateCategoryForm,
  createCategoryUnderGroup,
  saveCategory,
  resetOrDeleteCategory,
} = taxonomy;

async function openGroupEditor(groupId: string, options: { focusCreate?: boolean } = {}) {
  selectGroup(groupId, options);
  if (selection.value?.kind !== "group" || selection.value.id !== groupId) return;
  await focusEditorTarget("group");
}

async function openCategoryEditor(categoryId: string) {
  selectCategory(categoryId);
  if (selection.value?.kind !== "category" || selection.value.id !== categoryId) return;
  await focusEditorTarget("category");
}
</script>

<template>
  <section class="admin-taxonomy-view">
    <header class="admin-page-header admin-page-header--taxonomy">
      <div class="admin-page-copy">
        <p class="admin-page-kicker">目录编排</p>
        <h2>分类管理</h2>
      </div>
      <div class="admin-page-meta">
        <span class="admin-page-meta-label">当前焦点</span>
        <strong>{{ selection ? "编辑中" : "待选择" }}</strong>
      </div>
    </header>
    <div v-if="errorText" class="error-text admin-feedback error">{{ errorText }}</div>

    <div class="admin-workspace-grid admin-workspace-grid--balanced">
      <TaxonomyTreePanel
        class="admin-card"
        :loading="loading"
        :search-query="searchQuery"
        :show-hidden="showHidden"
        :tree-groups="tree.groups"
        :selection="selection"
        :taxonomy-meta-text="taxonomyMetaText"
        :is-group-open="isGroupOpen"
        :group-meta-text="groupMetaText"
        :category-meta-text="categoryMetaText"
        @update:search-query="searchQuery = $event"
        @update:show-hidden="showHidden = $event"
        @collapse-all="collapseAll"
        @expand-all="expandAll"
        @toggle-group="onToggleGroup($event.groupId, $event.open)"
        @select-group="openGroupEditor($event)"
        @focus-create-category="openGroupEditor($event, { focusCreate: true })"
        @select-category="openCategoryEditor($event)"
      />

      <div class="taxonomy-editor-slot">
        <div ref="editorTopRef" class="taxonomy-mobile-editor-top taxonomy-mobile-focus-anchor" aria-hidden="true" />

        <div v-if="selectedGroup" ref="groupEditorRef" class="taxonomy-mobile-focus-anchor">
          <GroupEditorPanel
            class="admin-card"
            :saving="saving"
            :selected-group="selectedGroup"
            :default-group-id="DEFAULT_GROUP_ID"
            :action-feedback="actionFeedback"
            :action-feedback-error="actionFeedbackError"
            :create-group-id="createGroupId"
            :create-group-title="createGroupTitle"
            :create-group-order="createGroupOrder"
            :create-group-hidden="createGroupHidden"
            :group-form-title="groupFormTitle"
            :group-form-order="groupFormOrder"
            :group-form-hidden="groupFormHidden"
            :create-category-id="createCategoryId"
            :create-category-title="createCategoryTitle"
            :create-category-order="createCategoryOrder"
            :create-category-hidden="createCategoryHidden"
            @update:create-group-id="createGroupId = $event"
            @update:create-group-title="createGroupTitle = $event"
            @update:create-group-order="createGroupOrder = $event"
            @update:create-group-hidden="createGroupHidden = $event"
            @update:group-form-title="groupFormTitle = $event"
            @update:group-form-order="groupFormOrder = $event"
            @update:group-form-hidden="groupFormHidden = $event"
            @update:create-category-id="createCategoryId = $event"
            @update:create-category-title="createCategoryTitle = $event"
            @update:create-category-order="createCategoryOrder = $event"
            @update:create-category-hidden="createCategoryHidden = $event"
            @reset-create-group="resetCreateGroupForm"
            @create-group="createGroupEntry"
            @save-group="saveGroup"
            @reset-or-delete-group="resetOrDeleteGroup"
            @reset-create-category="resetCreateCategoryForm"
            @create-category="createCategoryUnderGroup"
          />
        </div>

        <div v-else-if="selectedCategory" ref="categoryEditorRef" class="taxonomy-mobile-focus-anchor">
          <CategoryEditorPanel
            class="admin-card"
            :saving="saving"
            :selected-category="selectedCategory"
            :all-sorted-groups="allSortedGroups"
            :can-delete-selected-category="canDeleteSelectedCategory"
            :category-form-group-id="categoryFormGroupId"
            :category-form-title="categoryFormTitle"
            :category-form-order="categoryFormOrder"
            :category-form-hidden="categoryFormHidden"
            :action-feedback="actionFeedback"
            :action-feedback-error="actionFeedbackError"
            @update:category-form-group-id="categoryFormGroupId = $event"
            @update:category-form-title="categoryFormTitle = $event"
            @update:category-form-order="categoryFormOrder = $event"
            @update:category-form-hidden="categoryFormHidden = $event"
            @save-category="saveCategory"
            @reset-or-delete-category="resetOrDeleteCategory"
          />
        </div>

        <div v-else class="admin-card empty">选择节点以编辑</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-taxonomy-view {
  display: grid;
  gap: 12px;
}

.taxonomy-editor-slot {
  display: grid;
  align-content: start;
  position: sticky;
  align-self: start;
  top: calc(var(--app-topbar-height, 0px) + 12px);
  max-height: calc(100dvh - var(--app-topbar-height, 0px) - 32px);
  overflow: auto;
}

.taxonomy-mobile-editor-top {
  min-height: 0;
}

.taxonomy-mobile-focus-anchor {
  scroll-margin-top: calc(var(--app-topbar-height, 0px) + 16px);
}

.empty {
  border: 1px dashed var(--border);
  color: var(--muted);
  font-size: calc(13px * var(--ui-scale));
}

.error-text {
  color: var(--danger);
  font-size: calc(13px * var(--ui-scale));
}

@media (max-width: 960px) {
  .taxonomy-editor-slot {
    position: static;
    max-height: none;
    overflow: visible;
  }
}
</style>
