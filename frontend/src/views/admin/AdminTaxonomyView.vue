<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useTaxonomyAdmin } from "../../features/admin/taxonomy/useTaxonomyAdmin";
import { createAdminTaxonomyMobileEditorFocus } from "./taxonomy/useAdminTaxonomyMobileEditorFocus";
import CategoryEditorPanel from "./taxonomy/CategoryEditorPanel.vue";
import GroupEditorPanel from "./taxonomy/GroupEditorPanel.vue";
import TaxonomyTreePanel from "./taxonomy/TaxonomyTreePanel.vue";

const taxonomy = useTaxonomyAdmin();
type TaxonomyMobileSheetMode = "create-group" | "group" | "category" | null;

const editorTopRef = ref<HTMLElement | null>(null);
const groupEditorRef = ref<HTMLElement | null>(null);
const categoryEditorRef = ref<HTMLElement | null>(null);
const activeMobileEditorSheet = ref<TaxonomyMobileSheetMode>(null);
const mobileEditorSheetMaxWidth = 640;
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
const isMobileEditorSheetOpen = computed(() => Boolean(activeMobileEditorSheet.value));
const mobileSelectionSummary = computed(() => {
  if (selection.value?.kind === "group" && selectedGroup.value) {
    return `当前编辑大类：${selectedGroup.value.title || selectedGroup.value.id}`;
  }
  if (selection.value?.kind === "category" && selectedCategory.value) {
    return `当前编辑分类：${selectedCategory.value.title || selectedCategory.value.id}`;
  }
  return "先在树中选择节点，再进入编辑。";
});
const mobilePrimaryActionLabel = computed(() => {
  if (isMobileEditorSheetOpen.value) return "关闭编辑";
  if (selection.value) return "编辑当前节点";
  return "等待选择";
});
let bodyOverflowBeforeTaxonomySheet = "";

function isMobileEditorSheetViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(`(max-width: ${mobileEditorSheetMaxWidth}px)`).matches;
}

function closeMobileEditorSheet() {
  activeMobileEditorSheet.value = null;
}

async function openCreateGroupSheet() {
  selectGroup(selectedGroup.value?.id || DEFAULT_GROUP_ID);
  if (selection.value?.kind !== "group") return;
  activeMobileEditorSheet.value = "create-group";
  if (isMobileEditorSheetViewport()) return;
  await focusEditorTarget("group");
}

async function openCurrentSelectionSheet() {
  if (!selection.value) return;
  if (selection.value.kind === "group") {
    activeMobileEditorSheet.value = "group";
    if (isMobileEditorSheetViewport()) return;
    await focusEditorTarget("group");
    return;
  }
  activeMobileEditorSheet.value = "category";
  if (isMobileEditorSheetViewport()) return;
  await focusEditorTarget("category");
}

async function handleMobilePrimaryAction() {
  if (isMobileEditorSheetOpen.value) {
    closeMobileEditorSheet();
    return;
  }
  await openCurrentSelectionSheet();
}

async function openGroupEditor(groupId: string, options: { focusCreate?: boolean } = {}) {
  selectGroup(groupId, options);
  if (selection.value?.kind !== "group" || selection.value.id !== groupId) return;
  activeMobileEditorSheet.value = options.focusCreate ? "group" : "group";
  if (isMobileEditorSheetViewport()) return;
  await focusEditorTarget("group");
}

async function openCategoryEditor(categoryId: string) {
  selectCategory(categoryId);
  if (selection.value?.kind !== "category" || selection.value.id !== categoryId) return;
  activeMobileEditorSheet.value = "category";
  if (isMobileEditorSheetViewport()) return;
  await focusEditorTarget("category");
}

watch(isMobileEditorSheetOpen, (open) => {
  if (open && isMobileEditorSheetViewport()) {
    bodyOverflowBeforeTaxonomySheet = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return;
  }

  document.body.style.overflow = bodyOverflowBeforeTaxonomySheet;
  bodyOverflowBeforeTaxonomySheet = "";
});

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflowBeforeTaxonomySheet;
});
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

    <section class="taxonomy-mobile-actions admin-card">
      <div class="taxonomy-mobile-summary">
        <strong>{{ selection ? "已选节点" : "先选节点" }}</strong>
        <span>{{ mobileSelectionSummary }}</span>
      </div>
      <button type="button" class="btn btn-ghost" @click="openCreateGroupSheet">新建大类</button>
      <button type="button" class="btn btn-primary" :disabled="!selection && !isMobileEditorSheetOpen" @click="handleMobilePrimaryAction">
        {{ mobilePrimaryActionLabel }}
      </button>
    </section>

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

      <button
        v-if="isMobileEditorSheetOpen"
        type="button"
        class="taxonomy-editor-sheet-backdrop"
        aria-label="关闭分类编辑抽屉"
        @click="closeMobileEditorSheet"
      />

      <div :class="['taxonomy-editor-slot', 'taxonomy-editor-sheet', { 'is-open': isMobileEditorSheetOpen }]">
        <div ref="editorTopRef" class="taxonomy-mobile-editor-top taxonomy-mobile-focus-anchor" aria-hidden="true" />
        <div class="taxonomy-editor-sheet-header">
          <div class="taxonomy-editor-sheet-copy">
            <p class="admin-page-kicker">移动端编辑</p>
            <strong>{{ activeMobileEditorSheet === "create-group" ? "新建大类" : "节点编辑" }}</strong>
          </div>
          <button type="button" class="btn btn-ghost" @click="closeMobileEditorSheet">关闭</button>
        </div>

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
            :create-only="activeMobileEditorSheet === 'create-group'"
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

<style scoped src="./AdminTaxonomyView.css"></style>
