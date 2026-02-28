import { nextTick, onMounted, watch } from "vue";
import {
  normalizeTaxonomySelection,
  type TaxonomyCategory,
  type TaxonomyGroup,
  type TaxonomySelection,
} from "../taxonomyUiState";
import { createTaxonomyAdminActions } from "./useTaxonomyAdminActions";
import { useTaxonomyAdminDraftState } from "./useTaxonomyAdminDraftState";
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

  function setActionFeedback(text: string, isError = false) {
    actionFeedback.value = text;
    actionFeedbackError.value = isError;
  }

  function toUniqueIds(ids: string[]): string[] {
    return [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];
  }

  function persistUiState() {
    const payload = {
      search: searchQuery.value,
      showHidden: showHidden.value,
      openGroups: openGroupIds.value,
      selection: selection.value,
    };
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(payload));
  }

  function hydrateUiState() {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as {
        search?: unknown;
        showHidden?: unknown;
        openGroups?: unknown;
        selection?: unknown;
      };

      if (typeof saved.search === "string") searchQuery.value = saved.search;
      if (typeof saved.showHidden === "boolean") showHidden.value = saved.showHidden;
      if (Array.isArray(saved.openGroups)) {
        openGroupIds.value = toUniqueIds(saved.openGroups as string[]);
      }

      const nextSelection = saved.selection as TaxonomySelection | null;
      if (
        nextSelection &&
        typeof nextSelection === "object" &&
        (nextSelection.kind === "group" || nextSelection.kind === "category") &&
        typeof nextSelection.id === "string" &&
        nextSelection.id.trim()
      ) {
        selection.value = { kind: nextSelection.kind, id: nextSelection.id.trim() };
      }
    } catch {
      // Ignore invalid local cache.
    }
  }

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
    openGroupIds.value = toUniqueIds(openGroupIds.value).filter((id) => visibleGroupIds.has(id));

    if (selection.value?.kind === "group") {
      setGroupOpen(selection.value.id, true);
    }

    if (selection.value?.kind === "category") {
      const groupId = categoryById.value.get(selection.value.id)?.groupId;
      if (groupId) setGroupOpen(groupId, true);
    }

    if (openGroupIds.value.length === 0 && fallbackGroupId.value) {
      setGroupOpen(fallbackGroupId.value, true);
    }
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

  function resetCreateCategoryForm() {
    createCategoryId.value = "";
    createCategoryTitle.value = "";
    createCategoryOrder.value = 0;
    createCategoryHidden.value = false;
  }

  function resetCreateGroupForm() {
    createGroupId.value = "";
    createGroupTitle.value = "";
    createGroupOrder.value = 0;
    createGroupHidden.value = false;
  }

  function selectGroup(groupId: string, options: { focusCreate?: boolean } = {}) {
    selection.value = { kind: "group", id: groupId };
    setGroupOpen(groupId, true);
    syncFormsFromSelection();
    setActionFeedback("");

    if (options.focusCreate) {
      void nextTick(() => {
        document.querySelector<HTMLInputElement>("#taxonomy-category-create-id")?.focus();
      });
    }
  }

  function selectCategory(categoryId: string) {
    const category = categoryById.value.get(categoryId);
    if (!category) return;
    selection.value = { kind: "category", id: categoryId };
    setGroupOpen(category.groupId, true);
    syncFormsFromSelection();
    setActionFeedback("");
  }

  function isGroupOpen(groupId: string): boolean {
    if (searchQuery.value.trim()) return true;
    return openGroupIds.value.includes(groupId);
  }

  function onToggleGroup(groupId: string, open: boolean) {
    if (searchQuery.value.trim()) return;
    setGroupOpen(groupId, open);
  }

  function collapseAll() {
    openGroupIds.value = [];
  }

  function expandAll() {
    openGroupIds.value = visibleGroups.value.map((group) => group.id);
  }

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

  function categoryMetaText(category: CategoryRow): string {
    return `内容 ${Number(category.count || 0)} · 内置 ${Number(category.builtinCount || 0)} · 新增 ${Number(category.dynamicCount || 0)}`;
  }

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

  watch([searchQuery, showHidden], () => {
    syncSelectionAndOpenGroups();
    syncFormsFromSelection();
  });

  watch(
    [searchQuery, showHidden, openGroupIds, selection],
    () => {
      persistUiState();
    },
    { deep: true },
  );

  onMounted(async () => {
    hydrateUiState();
    await reloadTaxonomy();
    if (!selection.value && fallbackGroupId.value) {
      selection.value = { kind: "group", id: fallbackGroupId.value };
      syncFormsFromSelection();
    }
  });

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
