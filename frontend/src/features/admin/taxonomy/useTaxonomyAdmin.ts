import { computed, nextTick } from "vue";
import {
  normalizeTaxonomySelection,
  type TaxonomyCategory,
  type TaxonomyGroup,
} from "../taxonomyUiState";
import { createTaxonomyAdminActions } from "./useTaxonomyAdminActions";
import { useTaxonomyAdminDraftState } from "./useTaxonomyAdminDraftState";
import { usePendingChangesGuard } from "../composables/usePendingChangesGuard";
import { useTaxonomyAdminLifecycle } from "./useTaxonomyAdminLifecycle";

const DEFAULT_GROUP_ID = "physics";
const UI_STATE_KEY = "pa_taxonomy_ui";
type GroupRow = TaxonomyGroup;
type CategoryRow = TaxonomyCategory;

export function useTaxonomyAdmin() {
  const {
    loading,
    saving,
    errorText,
    actionFeedback,
    actionFeedbackError,
    groups,
    categories,
    searchQuery,
    showHidden,
    openGroupIds,
    selection,
    groupFormTitle,
    groupFormOrder,
    groupFormHidden,
    createGroupId,
    createGroupTitle,
    createGroupOrder,
    createGroupHidden,
    createCategoryId,
    createCategoryTitle,
    createCategoryOrder,
    createCategoryHidden,
    categoryFormGroupId,
    categoryFormTitle,
    categoryFormOrder,
    categoryFormHidden,
    tree,
    visibleGroups,
    allSortedGroups,
    categoryById,
    fallbackGroupId,
    selectedGroup,
    selectedCategory,
    selectedCreateGroupId,
    taxonomyMetaText,
    canDeleteSelectedCategory,
  } = useTaxonomyAdminDraftState({
    defaultGroupId: DEFAULT_GROUP_ID,
  });

  function setActionFeedback(text: string, isError = false) { actionFeedback.value = text; actionFeedbackError.value = isError; }

  function setGroupOpen(groupId: string, open: boolean) {
    const id = String(groupId || "").trim();
    if (!id) return;
    const next = new Set(openGroupIds.value);
    if (open) next.add(id);
    else next.delete(id);
    openGroupIds.value = [...next];
  }

  function syncSelectionAndOpenGroups() {
    selection.value = normalizeTaxonomySelection({
      selection: selection.value,
      groups: groups.value,
      categories: categories.value,
      showHidden: showHidden.value,
      fallbackGroupId: fallbackGroupId.value,
    });

    const visibleGroupIds = new Set(visibleGroups.value.map((group) => group.id));
    openGroupIds.value = [...new Set(openGroupIds.value.map((id) => String(id || "").trim()).filter(Boolean))].filter(
      (id) => visibleGroupIds.has(id),
    );

    if (selection.value?.kind === "group") setGroupOpen(selection.value.id, true);

    if (selection.value?.kind === "category") {
      const groupId = categoryById.value.get(selection.value.id)?.groupId;
      if (groupId) setGroupOpen(groupId, true);
    }
    if (openGroupIds.value.length === 0 && fallbackGroupId.value) setGroupOpen(fallbackGroupId.value, true);
  }

  function syncFormsFromSelection() {
    if (selectedGroup.value) {
      groupFormTitle.value = selectedGroup.value.title || "";
      groupFormOrder.value = Number(selectedGroup.value.order || 0);
      groupFormHidden.value = selectedGroup.value.hidden === true;
    }

    if (selectedCategory.value) {
      categoryFormGroupId.value = selectedCategory.value.groupId || fallbackGroupId.value;
      categoryFormTitle.value = selectedCategory.value.title || "";
      categoryFormOrder.value = Number(selectedCategory.value.order || 0);
      categoryFormHidden.value = selectedCategory.value.hidden === true;
    }
  }

  function resetCreateCategoryForm() { createCategoryId.value = ""; createCategoryTitle.value = ""; createCategoryOrder.value = 0; createCategoryHidden.value = false; }
  function resetCreateGroupForm() { createGroupId.value = ""; createGroupTitle.value = ""; createGroupOrder.value = 0; createGroupHidden.value = false; }

  function selectGroup(groupId: string, options: { focusCreate?: boolean } = {}) {
    selection.value = { kind: "group", id: groupId };
    setGroupOpen(groupId, true);
    syncFormsFromSelection();
    setActionFeedback("");
    if (options.focusCreate) void nextTick(() => { document.querySelector<HTMLInputElement>("#taxonomy-category-create-id")?.focus(); });
  }

  function selectCategory(categoryId: string) {
    const category = categoryById.value.get(categoryId);
    if (!category) return;
    selection.value = { kind: "category", id: categoryId };
    setGroupOpen(category.groupId, true);
    syncFormsFromSelection();
    setActionFeedback("");
  }

  function isGroupOpen(groupId: string): boolean { return searchQuery.value.trim() ? true : openGroupIds.value.includes(groupId); }
  function onToggleGroup(groupId: string, open: boolean) { if (searchQuery.value.trim()) return; setGroupOpen(groupId, open); }
  function collapseAll() { openGroupIds.value = []; }
  function expandAll() { openGroupIds.value = visibleGroups.value.map((group) => group.id); }

  function groupMetaText(node: { group: GroupRow; shownCategories: CategoryRow[] }): string {
    const totalCategories = Number(node.group.categoryCount || 0);
    const shownCategories = node.shownCategories.length;

    const totalItems = Number(node.group.count || 0);
    const shownItems = node.shownCategories.reduce((sum, category) => sum + Number(category.count || 0), 0);

    const categoryText =
      totalCategories && shownCategories !== totalCategories
        ? `分类 ${shownCategories}/${totalCategories}`
        : `分类 ${shownCategories}`;
    const itemText = totalItems && shownItems !== totalItems ? `内容 ${shownItems}/${totalItems}` : `内容 ${totalItems || shownItems}`;

    return `${categoryText} · ${itemText}`;
  }

  function categoryMetaText(category: CategoryRow): string { return `内容 ${Number(category.count || 0)} · 新增 ${Number(category.dynamicCount || 0)}`; }

  const hasPendingChanges = computed(() => {
    const hasGroupEditChanges = Boolean(selectedGroup.value) &&
      JSON.stringify({
        title: groupFormTitle.value,
        order: Number(groupFormOrder.value || 0),
        hidden: groupFormHidden.value,
      }) !==
        JSON.stringify({
          title: selectedGroup.value?.title || "",
          order: Number(selectedGroup.value?.order || 0),
          hidden: selectedGroup.value?.hidden === true,
        });

    const hasCreateGroupChanges =
      Boolean(createGroupId.value || createGroupTitle.value) ||
      Number(createGroupOrder.value || 0) !== 0 ||
      createGroupHidden.value;

    const hasCreateCategoryChanges =
      Boolean(createCategoryId.value || createCategoryTitle.value) ||
      Number(createCategoryOrder.value || 0) !== 0 ||
      createCategoryHidden.value;

    const hasCategoryEditChanges = Boolean(selectedCategory.value) &&
      JSON.stringify({
        groupId: categoryFormGroupId.value || fallbackGroupId.value,
        title: categoryFormTitle.value,
        order: Number(categoryFormOrder.value || 0),
        hidden: categoryFormHidden.value,
      }) !==
        JSON.stringify({
          groupId: selectedCategory.value?.groupId || fallbackGroupId.value,
          title: selectedCategory.value?.title || "",
          order: Number(selectedCategory.value?.order || 0),
          hidden: selectedCategory.value?.hidden === true,
        });

    return hasGroupEditChanges || hasCreateGroupChanges || hasCreateCategoryChanges || hasCategoryEditChanges;
  });

  const {
    reloadTaxonomy,
    saveGroup,
    createGroupEntry,
    resetOrDeleteGroup,
    createCategoryUnderGroup,
    saveCategory,
    resetOrDeleteCategory,
  } = createTaxonomyAdminActions({
    defaultGroupId: DEFAULT_GROUP_ID,
    loading,
    saving,
    errorText,
    groups,
    categories,
    selectedGroup,
    selectedCategory,
    selectedCreateGroupId,
    fallbackGroupId,
    groupFormTitle,
    groupFormOrder,
    groupFormHidden,
    createGroupId,
    createGroupTitle,
    createGroupOrder,
    createGroupHidden,
    createCategoryId,
    createCategoryTitle,
    createCategoryOrder,
    createCategoryHidden,
    categoryFormGroupId,
    categoryFormTitle,
    categoryFormOrder,
    categoryFormHidden,
    setActionFeedback,
    syncSelectionAndOpenGroups,
    syncFormsFromSelection,
    resetCreateCategoryForm,
    resetCreateGroupForm,
    selectGroup: (groupId: string) => selectGroup(groupId),
    selectCategory,
  });

  usePendingChangesGuard({ hasPendingChanges, isBlocked: saving, message: "分类内容有未保存更改，确定离开当前页面吗？" });
  useTaxonomyAdminLifecycle({ uiStateKey: UI_STATE_KEY, searchQuery, showHidden, openGroupIds, selection, fallbackGroupId, syncSelectionAndOpenGroups, syncFormsFromSelection, reloadTaxonomy });

  return {
    DEFAULT_GROUP_ID,
    loading,
    saving,
    errorText,
    actionFeedback,
    actionFeedbackError,
    groups,
    categories,
    searchQuery,
    showHidden,
    openGroupIds,
    selection,
    groupFormTitle,
    groupFormOrder,
    groupFormHidden,
    createGroupId,
    createGroupTitle,
    createGroupOrder,
    createGroupHidden,
    createCategoryId,
    createCategoryTitle,
    createCategoryOrder,
    createCategoryHidden,
    categoryFormGroupId,
    categoryFormTitle,
    categoryFormOrder,
    categoryFormHidden,
    tree,
    visibleGroups,
    allSortedGroups,
    selectedGroup,
    selectedCategory,
    selectedCreateGroupId,
    taxonomyMetaText,
    canDeleteSelectedCategory,
    setActionFeedback,
    setGroupOpen,
    syncSelectionAndOpenGroups,
    syncFormsFromSelection,
    resetCreateCategoryForm,
    resetCreateGroupForm,
    selectGroup,
    selectCategory,
    isGroupOpen,
    onToggleGroup,
    collapseAll,
    expandAll,
    groupMetaText,
    categoryMetaText,
    reloadTaxonomy,
    saveGroup,
    createGroupEntry,
    resetOrDeleteGroup,
    createCategoryUnderGroup,
    saveCategory,
    resetOrDeleteCategory,
  };
}
