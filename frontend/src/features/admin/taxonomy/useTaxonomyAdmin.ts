import { computed, nextTick } from 'vue'
import { normalizeTaxonomySelection, type TaxonomyCategory, type TaxonomyGroup } from '../taxonomyUiState'
import { createTaxonomyAdminActions } from './useTaxonomyAdminActions'
import { useTaxonomyAdminDraftState } from './useTaxonomyAdminDraftState'
import { usePendingChangesGuard } from '../composables/usePendingChangesGuard'
import { useTaxonomyAdminLifecycle } from './useTaxonomyAdminLifecycle'
import { groupMetaText, categoryMetaText, buildHasPendingChanges, buildSetGroupOpen } from './useTaxonomyAdminHelpers'
import { DEFAULT_GROUP_ID } from '@/features/shared/constants'

const UI_STATE_KEY = 'pa_taxonomy_ui'
type GroupRow = TaxonomyGroup
type CategoryRow = TaxonomyCategory

export function useTaxonomyAdmin() {
  const {
    loading, saving, errorText, actionFeedback, actionFeedbackError,
    groups, categories, searchQuery, showHidden, openGroupIds, selection,
    groupFormTitle, groupFormOrder, groupFormHidden,
    createGroupId, createGroupTitle, createGroupOrder, createGroupHidden,
    createCategoryId, createCategoryTitle, createCategoryOrder, createCategoryHidden,
    categoryFormGroupId, categoryFormTitle, categoryFormOrder, categoryFormHidden,
    tree, visibleGroups, allSortedGroups, categoryById, fallbackGroupId,
    selectedGroup, selectedCategory, selectedCreateGroupId, taxonomyMetaText, canDeleteSelectedCategory,
  } = useTaxonomyAdminDraftState({ defaultGroupId: DEFAULT_GROUP_ID })

  function setActionFeedback(text: string, isError = false) {
    actionFeedback.value = text
    actionFeedbackError.value = isError
  }

  const setGroupOpen = buildSetGroupOpen(openGroupIds)

  function syncSelectionAndOpenGroups() {
    selection.value = normalizeTaxonomySelection({ selection: selection.value, groups: groups.value, categories: categories.value, showHidden: showHidden.value, fallbackGroupId: fallbackGroupId.value })

    const visibleGroupIds = new Set(visibleGroups.value.map(group => group.id))
    openGroupIds.value = [...new Set(openGroupIds.value.map(id => String(id || '').trim()).filter(Boolean))].filter(id => visibleGroupIds.has(id))

    if (selection.value?.kind === 'group') setGroupOpen(selection.value.id, true)
    if (selection.value?.kind === 'category') {
      const groupId = categoryById.value.get(selection.value.id)?.groupId
      if (groupId) setGroupOpen(groupId, true)
    }
    if (openGroupIds.value.length === 0 && fallbackGroupId.value) setGroupOpen(fallbackGroupId.value, true)
  }

  function syncFormsFromSelection() {
    if (selectedGroup.value) {
      groupFormTitle.value = selectedGroup.value.title || ''
      groupFormOrder.value = Number(selectedGroup.value.order || 0)
      groupFormHidden.value = selectedGroup.value.hidden === true
    }
    if (selectedCategory.value) {
      categoryFormGroupId.value = selectedCategory.value.groupId || fallbackGroupId.value
      categoryFormTitle.value = selectedCategory.value.title || ''
      categoryFormOrder.value = Number(selectedCategory.value.order || 0)
      categoryFormHidden.value = selectedCategory.value.hidden === true
    }
  }

  function resetCreateCategoryForm() {
    createCategoryId.value = ''
    createCategoryTitle.value = ''
    createCategoryOrder.value = 0
    createCategoryHidden.value = false
  }
  function resetCreateGroupForm() {
    createGroupId.value = ''
    createGroupTitle.value = ''
    createGroupOrder.value = 0
    createGroupHidden.value = false
  }

  function selectGroup(groupId: string, options: { focusCreate?: boolean } = {}) {
    selection.value = { kind: 'group', id: groupId }
    setGroupOpen(groupId, true)
    syncFormsFromSelection()
    setActionFeedback('')
    if (options.focusCreate) void nextTick(() => document.querySelector<HTMLInputElement>('#taxonomy-category-create-id')?.focus())
  }

  function selectCategory(categoryId: string) {
    const category = categoryById.value.get(categoryId)
    if (!category) return
    selection.value = { kind: 'category', id: categoryId }
    setGroupOpen(category.groupId, true)
    syncFormsFromSelection()
    setActionFeedback('')
  }

  function isGroupOpen(groupId: string): boolean {
    return searchQuery.value.trim() ? true : openGroupIds.value.includes(groupId)
  }
  function onToggleGroup(groupId: string, open: boolean) {
    if (searchQuery.value.trim()) return
    setGroupOpen(groupId, open)
  }
  function collapseAll() { openGroupIds.value = [] }
  function expandAll() { openGroupIds.value = visibleGroups.value.map(group => group.id) }

  const hasPendingChanges = computed(() => buildHasPendingChanges(
    selectedGroup.value, selectedCategory.value, fallbackGroupId.value,
    groupFormTitle.value, groupFormOrder.value, groupFormHidden.value,
    createGroupId.value, createGroupTitle.value, createGroupOrder.value, createGroupHidden.value,
    createCategoryId.value, createCategoryTitle.value, createCategoryOrder.value, createCategoryHidden.value,
    categoryFormGroupId.value, categoryFormTitle.value, categoryFormOrder.value, categoryFormHidden.value
  ))

  const {
    reloadTaxonomy, saveGroup, createGroupEntry, resetOrDeleteGroup,
    createCategoryUnderGroup, saveCategory, resetOrDeleteCategory,
  } = createTaxonomyAdminActions({
    defaultGroupId: DEFAULT_GROUP_ID, loading, saving, errorText, groups, categories,
    selectedGroup, selectedCategory, selectedCreateGroupId, fallbackGroupId,
    groupFormTitle, groupFormOrder, groupFormHidden,
    createGroupId, createGroupTitle, createGroupOrder, createGroupHidden,
    createCategoryId, createCategoryTitle, createCategoryOrder, createCategoryHidden,
    categoryFormGroupId, categoryFormTitle, categoryFormOrder, categoryFormHidden,
    setActionFeedback, syncSelectionAndOpenGroups, syncFormsFromSelection,
    resetCreateCategoryForm, resetCreateGroupForm,
    selectGroup: (groupId: string) => selectGroup(groupId), selectCategory,
  })

  usePendingChangesGuard({ hasPendingChanges, isBlocked: saving, message: '分类内容有未保存更改，确定离开当前页面吗？' })
  useTaxonomyAdminLifecycle({
    uiStateKey: UI_STATE_KEY, searchQuery, showHidden, openGroupIds, selection, fallbackGroupId,
    syncSelectionAndOpenGroups, syncFormsFromSelection, reloadTaxonomy,
  })

  return {
    DEFAULT_GROUP_ID, loading, saving, errorText, actionFeedback, actionFeedbackError,
    groups, categories, searchQuery, showHidden, openGroupIds, selection,
    groupFormTitle, groupFormOrder, groupFormHidden,
    createGroupId, createGroupTitle, createGroupOrder, createGroupHidden,
    createCategoryId, createCategoryTitle, createCategoryOrder, createCategoryHidden,
    categoryFormGroupId, categoryFormTitle, categoryFormOrder, categoryFormHidden,
    tree, visibleGroups, allSortedGroups, selectedGroup, selectedCategory, selectedCreateGroupId,
    taxonomyMetaText, canDeleteSelectedCategory, setActionFeedback, setGroupOpen,
    syncSelectionAndOpenGroups, syncFormsFromSelection, resetCreateCategoryForm, resetCreateGroupForm,
    selectGroup, selectCategory, isGroupOpen, onToggleGroup, collapseAll, expandAll,
    groupMetaText, categoryMetaText, reloadTaxonomy, saveGroup, createGroupEntry, resetOrDeleteGroup,
    createCategoryUnderGroup, saveCategory, resetOrDeleteCategory,
  }
}
