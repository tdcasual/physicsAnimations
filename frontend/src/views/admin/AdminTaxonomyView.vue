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
        <p class="admin-page-intro">把公开目录的分章结构和课堂检索路径保持一致，避免入口命名和实际内容脱节。</p>
      </div>
      <div class="admin-page-meta">
        <span class="admin-page-meta-label">当前焦点</span>
        <strong>{{ selection ? "正在调整分类结构" : "等待选择节点" }}</strong>
        <span>{{ selection ? "左侧树负责导航，右侧编辑区承接大类与二级分类的连续修订。" : "先从左侧选择大类或二级分类，再进入对应编辑面板。" }}</span>
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

        <div v-else class="admin-card empty">请选择左侧的大类或二级分类进行编辑。</div>
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
  font-size: 13px;
}

.error-text {
  color: var(--danger);
  font-size: 13px;
}
</style>
