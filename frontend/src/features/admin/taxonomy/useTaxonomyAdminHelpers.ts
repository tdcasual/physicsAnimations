import type { TaxonomyGroup, TaxonomyCategory } from '../taxonomyUiState'

type GroupRow = TaxonomyGroup
type CategoryRow = TaxonomyCategory

export function groupMetaText(node: { group: GroupRow; shownCategories: CategoryRow[] }): string {
  const totalCategories = Number(node.group.categoryCount || 0)
  const shownCategories = node.shownCategories.length
  const totalItems = Number(node.group.count || 0)
  const shownItems = node.shownCategories.reduce((sum, category) => sum + Number(category.count || 0), 0)

  const categoryText = totalCategories && shownCategories !== totalCategories ? `分类 ${shownCategories}/${totalCategories}` : `分类 ${shownCategories}`
  const itemText = totalItems && shownItems !== totalItems ? `内容 ${shownItems}/${totalItems}` : `内容 ${totalItems || shownItems}`

  return `${categoryText} · ${itemText}`
}

export function categoryMetaText(category: CategoryRow): string {
  return `内容 ${Number(category.count || 0)} · 新增 ${Number(category.dynamicCount || 0)}`
}

export function buildHasPendingChanges(
  selectedGroup: GroupRow | null,
  selectedCategory: CategoryRow | null,
  fallbackGroupId: string,
  groupFormTitle: string,
  groupFormOrder: number,
  groupFormHidden: boolean,
  createGroupId: string,
  createGroupTitle: string,
  createGroupOrder: number,
  createGroupHidden: boolean,
  createCategoryId: string,
  createCategoryTitle: string,
  createCategoryOrder: number,
  createCategoryHidden: boolean,
  categoryFormGroupId: string,
  categoryFormTitle: string,
  categoryFormOrder: number,
  categoryFormHidden: boolean
): boolean {
  const hasGroupEditChanges = Boolean(selectedGroup) && JSON.stringify({ title: groupFormTitle, order: Number(groupFormOrder || 0), hidden: groupFormHidden }) !== JSON.stringify({ title: selectedGroup?.title || '', order: Number(selectedGroup?.order || 0), hidden: selectedGroup?.hidden === true })

  const hasCreateGroupChanges = Boolean(createGroupId || createGroupTitle) || Number(createGroupOrder || 0) !== 0 || createGroupHidden

  const hasCreateCategoryChanges = Boolean(createCategoryId || createCategoryTitle) || Number(createCategoryOrder || 0) !== 0 || createCategoryHidden

  const hasCategoryEditChanges = Boolean(selectedCategory) && JSON.stringify({ groupId: categoryFormGroupId || fallbackGroupId, title: categoryFormTitle, order: Number(categoryFormOrder || 0), hidden: categoryFormHidden }) !== JSON.stringify({ groupId: selectedCategory?.groupId || fallbackGroupId, title: selectedCategory?.title || '', order: Number(selectedCategory?.order || 0), hidden: selectedCategory?.hidden === true })

  return hasGroupEditChanges || hasCreateGroupChanges || hasCreateCategoryChanges || hasCategoryEditChanges
}

export function buildSetGroupOpen(openGroupIds: { value: string[] }) {
  return (groupId: string, open: boolean) => {
    const id = String(groupId || '').trim()
    if (!id) return
    const next = new Set(openGroupIds.value)
    if (open) next.add(id)
    else next.delete(id)
    openGroupIds.value = [...next]
  }
}
