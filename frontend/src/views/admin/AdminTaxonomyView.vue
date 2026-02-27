<script setup lang="ts">
import { useTaxonomyAdmin } from "../../features/admin/taxonomy/useTaxonomyAdmin";
import CategoryEditorPanel from "./taxonomy/CategoryEditorPanel.vue";
import GroupEditorPanel from "./taxonomy/GroupEditorPanel.vue";
import TaxonomyTreePanel from "./taxonomy/TaxonomyTreePanel.vue";

const taxonomy = useTaxonomyAdmin();

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
</script>

<template>
  <section class="admin-taxonomy-view">
    <h2>分类管理</h2>
    <div v-if="errorText" class="error-text">{{ errorText }}</div>

    <div class="layout-grid">
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
        @select-group="selectGroup($event)"
        @focus-create-category="selectGroup($event, { focusCreate: true })"
        @select-category="selectCategory($event)"
      />

      <GroupEditorPanel
        v-if="selectedGroup"
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

      <CategoryEditorPanel
        v-else-if="selectedCategory"
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

      <div v-else class="panel admin-card empty">请选择左侧的大类或二级分类进行编辑。</div>
    </div>
  </section>
</template>

<style scoped>
.admin-taxonomy-view {
  display: grid;
  gap: 12px;
}

h2 {
  margin: 0;
}

.layout-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 12px;
}

@media (max-width: 960px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }
}

.panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 12px;
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
