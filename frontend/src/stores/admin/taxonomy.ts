import { computed, ref, type ComputedRef } from 'vue'
import { defineStore } from 'pinia'
import {
  listTaxonomy,
  createGroup,
  updateGroup,
  deleteGroup,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/features/admin/adminApi'

interface TaxonomyGroup {
  id: string
  title: string
  order?: number
  hidden?: boolean
  count?: number
  categoryCount?: number
}

interface TaxonomyCategory {
  id: string
  groupId: string
  title: string
  order?: number
  hidden?: boolean
  count?: number
  dynamicCount?: number
}

interface TaxonomySelection {
  kind: 'group' | 'category'
  id: string
}

interface TaxonomyTreeNode {
  group: TaxonomyGroup
  categories: TaxonomyCategory[]
}

/**
 * 分类管理 Store
 *
 * 管理学科分组和分类的 CRUD 操作
 */
export const useTaxonomyAdminStore = defineStore('admin/taxonomy', () => {
  const DEFAULT_GROUP_ID = 'physics'
  const UI_STATE_KEY = 'pa_taxonomy_ui'

  // State
  const loading = ref(false)
  const saving = ref(false)
  const errorText = ref('')
  const actionFeedback = ref('')
  const actionFeedbackError = ref(false)
  const groups = ref<TaxonomyGroup[]>([])
  const categories = ref<TaxonomyCategory[]>([])
  const searchQuery = ref('')
  const showHidden = ref(false)
  const openGroupIds = ref<string[]>([])
  const selection = ref<TaxonomySelection | null>(null)

  // Form states
  const groupForm = ref({
    title: '',
    order: 0,
    hidden: false,
  })

  const categoryForm = ref({
    groupId: DEFAULT_GROUP_ID,
    title: '',
    order: 0,
    hidden: false,
  })

  const createGroupForm = ref({
    id: '',
    title: '',
    order: 0,
    hidden: false,
  })

  const createCategoryForm = ref({
    id: '',
    title: '',
    order: 0,
    hidden: false,
  })

  // Getters
  const categoryById: ComputedRef<Map<string, TaxonomyCategory>> = computed(() => {
    return new Map(categories.value.map(c => [c.id, c]))
  })

  const fallbackGroupId: ComputedRef<string> = computed(() => {
    const found = groups.value.find(g => g.id === DEFAULT_GROUP_ID)
    return found?.id || groups.value[0]?.id || DEFAULT_GROUP_ID
  })

  const filteredCategories = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return categories.value
    return categories.value.filter(
      c =>
        c.title.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query) ||
        groups.value
          .find(g => g.id === c.groupId)
          ?.title.toLowerCase()
          .includes(query)
    )
  })

  const visibleGroups = computed(() => {
    if (showHidden.value) return groups.value
    return groups.value.filter(g => !g.hidden)
  })

  const tree: ComputedRef<TaxonomyTreeNode[]> = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    return visibleGroups.value.map(group => {
      let groupCategories = categories.value.filter(c => c.groupId === group.id)
      if (!showHidden.value) {
        groupCategories = groupCategories.filter(c => !c.hidden)
      }
      if (query) {
        groupCategories = groupCategories.filter(
          c => c.title.toLowerCase().includes(query) || c.id.toLowerCase().includes(query)
        )
      }
      return {
        group,
        categories: groupCategories.sort((a, b) => (b.order ?? 0) - (a.order ?? 0)),
      }
    })
  })

  const selectedGroup: ComputedRef<TaxonomyGroup | null> = computed(() => {
    if (selection.value?.kind !== 'group') return null
    return groups.value.find(g => g.id === selection.value!.id) || null
  })

  const selectedCategory: ComputedRef<TaxonomyCategory | null> = computed(() => {
    if (selection.value?.kind !== 'category') return null
    return categoryById.value.get(selection.value.id) || null
  })

  const hasPendingChanges = computed(() => {
    const group = selectedGroup.value
    const category = selectedCategory.value

    if (group) {
      if (
        groupForm.value.title !== (group.title || '') ||
        groupForm.value.order !== (group.order ?? 0) ||
        groupForm.value.hidden !== (group.hidden === true)
      ) {
        return true
      }
    }

    if (category) {
      if (
        categoryForm.value.title !== (category.title || '') ||
        categoryForm.value.order !== (category.order ?? 0) ||
        categoryForm.value.hidden !== (category.hidden === true) ||
        categoryForm.value.groupId !== (category.groupId || fallbackGroupId.value)
      ) {
        return true
      }
    }

    return false
  })

  // Actions
  function setActionFeedback(text: string, isError = false) {
    actionFeedback.value = text
    actionFeedbackError.value = isError
  }

  function selectGroup(groupId: string) {
    selection.value = { kind: 'group', id: groupId }
    if (!openGroupIds.value.includes(groupId)) {
      openGroupIds.value.push(groupId)
    }
    const group = groups.value.find(g => g.id === groupId)
    if (group) {
      groupForm.value = {
        title: group.title || '',
        order: group.order ?? 0,
        hidden: group.hidden === true,
      }
    }
  }

  function selectCategory(categoryId: string) {
    const category = categoryById.value.get(categoryId)
    if (!category) return
    selection.value = { kind: 'category', id: categoryId }
    if (category.groupId && !openGroupIds.value.includes(category.groupId)) {
      openGroupIds.value.push(category.groupId)
    }
    categoryForm.value = {
      title: category.title || '',
      order: category.order ?? 0,
      hidden: category.hidden === true,
      groupId: category.groupId || fallbackGroupId.value,
    }
  }

  function setGroupOpen(groupId: string, open: boolean) {
    const index = openGroupIds.value.indexOf(groupId)
    if (open && index === -1) {
      openGroupIds.value.push(groupId)
    } else if (!open && index !== -1) {
      openGroupIds.value.splice(index, 1)
    }
  }

  function toggleGroup(groupId: string) {
    if (searchQuery.value.trim()) return
    const index = openGroupIds.value.indexOf(groupId)
    if (index === -1) {
      openGroupIds.value.push(groupId)
    } else {
      openGroupIds.value.splice(index, 1)
    }
  }

  function collapseAll() {
    openGroupIds.value = []
  }

  function expandAll() {
    openGroupIds.value = visibleGroups.value.map(g => g.id)
  }

  function resetForms() {
    groupForm.value = { title: '', order: 0, hidden: false }
    categoryForm.value = { title: '', order: 0, hidden: false, groupId: fallbackGroupId.value }
    createGroupForm.value = { id: '', title: '', order: 0, hidden: false }
    createCategoryForm.value = { id: '', title: '', order: 0, hidden: false }
  }

  async function reloadTaxonomy() {
    loading.value = true
    errorText.value = ''
    try {
      const data = await listTaxonomy()
      groups.value = data.groups || []
      categories.value = data.categories || []

      // Restore selection if valid
      if (selection.value) {
        if (selection.value.kind === 'group') {
          const exists = groups.value.some(g => g.id === selection.value!.id)
          if (!exists) selection.value = null
        } else {
          const exists = categories.value.some(c => c.id === selection.value!.id)
          if (!exists) selection.value = null
        }
      }

      // Ensure at least one group is open
      if (openGroupIds.value.length === 0 && fallbackGroupId.value) {
        openGroupIds.value = [fallbackGroupId.value]
      }

      return data
    } catch (err) {
      errorText.value = '加载分类数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function saveGroup(): Promise<boolean> {
    const group = selectedGroup.value
    if (!group) return false

    saving.value = true
    setActionFeedback('')
    try {
      await updateGroup(group.id, {
        title: groupForm.value.title,
        order: groupForm.value.order,
        hidden: groupForm.value.hidden,
      })
      await reloadTaxonomy()
      setActionFeedback('分组保存成功', false)
      return true
    } catch (err) {
      const e = err as { status?: number }
      setActionFeedback(e?.status === 401 ? '请先登录管理员账号。' : '保存失败', true)
      return false
    } finally {
      saving.value = false
    }
  }

  async function createGroupEntry(): Promise<boolean> {
    if (!createGroupForm.value.id.trim()) {
      setActionFeedback('请输入分组 ID', true)
      return false
    }

    saving.value = true
    setActionFeedback('')
    try {
      await createGroup({
        id: createGroupForm.value.id.trim(),
        title: createGroupForm.value.title,
        order: createGroupForm.value.order,
        hidden: createGroupForm.value.hidden,
      })
      createGroupForm.value = { id: '', title: '', order: 0, hidden: false }
      await reloadTaxonomy()
      setActionFeedback('分组创建成功', false)
      return true
    } catch (err) {
      const e = err as { status?: number }
      setActionFeedback(e?.status === 401 ? '请先登录管理员账号。' : '创建失败', true)
      return false
    } finally {
      saving.value = false
    }
  }

  async function deleteSelectedGroup(): Promise<boolean> {
    const group = selectedGroup.value
    if (!group) return false

    saving.value = true
    try {
      await deleteGroup(group.id)
      selection.value = null
      await reloadTaxonomy()
      setActionFeedback('分组删除成功', false)
      return true
    } catch (err) {
      const e = err as { status?: number }
      setActionFeedback(e?.status === 401 ? '请先登录管理员账号。' : '删除失败', true)
      return false
    } finally {
      saving.value = false
    }
  }

  async function saveCategory(): Promise<boolean> {
    const category = selectedCategory.value
    if (!category) return false

    saving.value = true
    setActionFeedback('')
    try {
      await updateCategory(category.id, {
        title: categoryForm.value.title,
        order: categoryForm.value.order,
        hidden: categoryForm.value.hidden,
        groupId: categoryForm.value.groupId,
      })
      await reloadTaxonomy()
      setActionFeedback('分类保存成功', false)
      return true
    } catch (err) {
      const e = err as { status?: number }
      setActionFeedback(e?.status === 401 ? '请先登录管理员账号。' : '保存失败', true)
      return false
    } finally {
      saving.value = false
    }
  }

  async function createCategoryEntry(groupId?: string): Promise<boolean> {
    const targetGroupId = groupId || fallbackGroupId.value
    if (!createCategoryForm.value.id.trim()) {
      setActionFeedback('请输入分类 ID', true)
      return false
    }

    saving.value = true
    setActionFeedback('')
    try {
      await createCategory({
        id: createCategoryForm.value.id.trim(),
        groupId: targetGroupId,
        title: createCategoryForm.value.title,
        order: createCategoryForm.value.order,
        hidden: createCategoryForm.value.hidden,
      })
      createCategoryForm.value = { id: '', title: '', order: 0, hidden: false }
      await reloadTaxonomy()
      setActionFeedback('分类创建成功', false)
      return true
    } catch (err) {
      const e = err as { status?: number }
      setActionFeedback(e?.status === 401 ? '请先登录管理员账号。' : '创建失败', true)
      return false
    } finally {
      saving.value = false
    }
  }

  async function deleteSelectedCategory(): Promise<boolean> {
    const category = selectedCategory.value
    if (!category) return false

    saving.value = true
    try {
      await deleteCategory(category.id)
      selection.value = null
      await reloadTaxonomy()
      setActionFeedback('分类删除成功', false)
      return true
    } catch (err) {
      const e = err as { status?: number }
      setActionFeedback(e?.status === 401 ? '请先登录管理员账号。' : '删除失败', true)
      return false
    } finally {
      saving.value = false
    }
  }

  // Initialize
  async function initialize() {
    // Load UI state from localStorage
    try {
      const saved = localStorage.getItem(UI_STATE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.showHidden !== undefined) showHidden.value = Boolean(data.showHidden)
        if (data.openGroupIds) openGroupIds.value = data.openGroupIds
      }
    } catch {
      // ignore
    }

    await reloadTaxonomy()
  }

  // Persist UI state
  function persistUiState() {
    try {
      localStorage.setItem(
        UI_STATE_KEY,
        JSON.stringify({
          showHidden: showHidden.value,
          openGroupIds: openGroupIds.value,
        })
      )
    } catch {
      // ignore
    }
  }

  return {
    // Constants
    DEFAULT_GROUP_ID,

    // State
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
    groupForm,
    categoryForm,
    createGroupForm,
    createCategoryForm,

    // Getters
    categoryById,
    fallbackGroupId,
    filteredCategories,
    visibleGroups,
    tree,
    selectedGroup,
    selectedCategory,
    hasPendingChanges,

    // Actions
    setActionFeedback,
    selectGroup,
    selectCategory,
    setGroupOpen,
    toggleGroup,
    collapseAll,
    expandAll,
    resetForms,
    reloadTaxonomy,
    saveGroup,
    createGroupEntry,
    deleteSelectedGroup,
    saveCategory,
    createCategoryEntry,
    deleteSelectedCategory,
    initialize,
    persistUiState,
  }
})
