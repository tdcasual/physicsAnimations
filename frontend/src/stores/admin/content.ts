import { computed, ref, type ComputedRef } from 'vue'
import { defineStore } from 'pinia'
import {
  type AdminItemRow,
  createLinkItem,
  deleteItem,
  listItems,
  listTaxonomy,
  updateItem,
} from '@/features/admin/adminApi'
import { normalizePublicUrl } from '@/features/catalog/catalogLink'
import { usePagedAdminList } from '@/features/admin/composables/usePagedAdminList'
import { useActionFeedback } from '@/features/admin/composables/useActionFeedback'
import { useFieldErrors } from '@/features/admin/composables/useFieldErrors'

interface CategoryRow {
  id: string
  groupId: string
  title: string
}

interface GroupRow {
  id: string
  title: string
}

type AdminItem = AdminItemRow

export interface ContentEditState {
  id: string | null
  title: string
  description: string
  categoryId: string
  order: number
  published: boolean
  hidden: boolean
}

/**
 * 内容管理 Store
 *
 * 管理目录条目（链接/上传）的 CRUD 操作
 */
export const useContentAdminStore = defineStore('admin/content', () => {
  // State
  const loading = ref(false)
  const saving = ref(false)
  const errorText = ref('')
  const query = ref('')
  const categories = ref<CategoryRow[]>([])
  const groups = ref<GroupRow[]>([])

  // Link creation form
  const linkCategoryId = ref('other')
  const linkUrl = ref('')
  const linkTitle = ref('')
  const linkDescription = ref('')

  // Edit state
  const editState = ref<ContentEditState>({
    id: null,
    title: '',
    description: '',
    categoryId: 'other',
    order: 0,
    published: false,
    hidden: false,
  })

  // Paged list
  const {
    items,
    total,
    page,
    pageSize,
    hasMore,
    nextRequestSeq,
    isLatestRequest,
    applyPageResult,
    resetList,
  } = usePagedAdminList<AdminItem>({ pageSize: 24 })

  // Field errors
  const fieldErrors = ref<Record<string, string>>({})
  const fieldErrorState = useFieldErrors(fieldErrors)

  // Feedback
  const { actionFeedback, actionFeedbackError, setActionFeedback } = useActionFeedback()

  // Getters
  const groupedCategoryOptions: ComputedRef<{ value: string; label: string }[]> = computed(() => {
    const groupsMap = new Map(groups.value.map(group => [group.id, group.title]))
    return categories.value.map(category => ({
      value: category.id,
      label: `${groupsMap.get(category.groupId) || category.groupId} / ${category.title}`,
    }))
  })

  const selectedItem: ComputedRef<AdminItem | null> = computed(() => {
    if (!editState.value.id) return null
    return items.value.find(item => item.id === editState.value.id) || null
  })

  const hasPendingEditChanges: ComputedRef<boolean> = computed(() => {
    const item = selectedItem.value
    if (!item || !editState.value.id) return false
    return (
      editState.value.title !== (item.title || '') ||
      editState.value.description !== (item.description || '') ||
      editState.value.categoryId !== (item.categoryId || 'other') ||
      editState.value.order !== (item.order ?? 0) ||
      editState.value.published !== (item.published ?? false) ||
      editState.value.hidden !== (item.hidden ?? false)
    )
  })

  function viewerHref(id: string): string {
    const base = import.meta.env.BASE_URL || '/'
    return `${base.replace(/\/+$/, '/')}viewer/${encodeURIComponent(id)}`
  }

  function previewHref(item: AdminItem): string {
    return normalizePublicUrl(item.src || viewerHref(item.id))
  }

  // Actions
  function setFieldError(key: string, message: string) {
    fieldErrorState.setFieldError(key, message)
  }

  function clearFieldErrors(key?: string) {
    fieldErrorState.clearFieldErrors(key)
  }

  function getFieldError(key: string): string {
    return fieldErrorState.getFieldError(key)
  }

  function beginEdit(item: AdminItem) {
    editState.value = {
      id: item.id,
      title: item.title || '',
      description: item.description || '',
      categoryId: item.categoryId || 'other',
      order: item.order ?? 0,
      published: item.published ?? false,
      hidden: item.hidden ?? false,
    }
    clearFieldErrors()
  }

  function resetEdit() {
    editState.value = {
      id: null,
      title: '',
      description: '',
      categoryId: 'other',
      order: 0,
      published: false,
      hidden: false,
    }
    clearFieldErrors()
  }

  async function reloadTaxonomy() {
    try {
      const taxonomy = await listTaxonomy()
      groups.value = taxonomy.groups || []
      categories.value = taxonomy.categories || []
      return taxonomy
    } catch (err) {
      errorText.value = '加载分类数据失败'
      throw err
    }
  }

  async function reloadItems(options: { reset?: boolean } = {}) {
    const seq = nextRequestSeq()
    loading.value = true
    errorText.value = ''
    try {
      const result = await listItems({
        page: options.reset ? 1 : page.value,
        pageSize: pageSize,
        query: query.value,
      })
      if (isLatestRequest(seq)) {
        applyPageResult(result, { reset: options.reset ?? false })
      }
      return result
    } catch (err) {
      errorText.value = '加载列表失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function saveEdit(): Promise<boolean> {
    const id = editState.value.id
    if (!id) return false

    const payload = {
      title: editState.value.title,
      description: editState.value.description,
      categoryId: editState.value.categoryId,
      order: editState.value.order,
      published: editState.value.published,
      hidden: editState.value.hidden,
    }

    saving.value = true
    setActionFeedback('')
    try {
      await updateItem(id, payload)
      await reloadItems({ reset: true })
      resetEdit()
      setActionFeedback('保存成功', false)
      return true
    } catch (err) {
      const e = err as { status?: number }
      setActionFeedback(e?.status === 401 ? '请先登录管理员账号。' : '保存失败', true)
      return false
    } finally {
      saving.value = false
    }
  }

  async function removeItem(id: string): Promise<boolean> {
    saving.value = true
    try {
      await deleteItem(id)
      if (editState.value.id === id) {
        resetEdit()
      }
      await reloadItems({ reset: true })
      setActionFeedback('删除成功', false)
      return true
    } catch (err) {
      const e = err as { status?: number }
      setActionFeedback(e?.status === 401 ? '请先登录管理员账号。' : '删除失败', true)
      return false
    } finally {
      saving.value = false
    }
  }

  async function submitLink(): Promise<boolean> {
    const normalizedUrl = linkUrl.value.trim()
    if (!normalizedUrl) {
      setFieldError('createLinkUrl', '请先填写链接地址。')
      return false
    }
    clearFieldErrors('createLinkUrl')

    saving.value = true
    setActionFeedback('')
    try {
      await createLinkItem({
        url: normalizedUrl,
        categoryId: linkCategoryId.value,
        title: linkTitle.value.trim(),
        description: linkDescription.value.trim(),
      })
      linkUrl.value = ''
      linkTitle.value = ''
      linkDescription.value = ''
      clearFieldErrors('createLinkUrl')
      await reloadItems({ reset: true })
      setActionFeedback('链接已添加。', false)
      return true
    } catch (err) {
      const e = err as { status?: number }
      setActionFeedback(e?.status === 401 ? '请先登录管理员账号。' : '新增链接失败。', true)
      return false
    } finally {
      saving.value = false
    }
  }

  async function initialize() {
    await reloadTaxonomy().catch(() => {})
    await reloadItems({ reset: true })
  }

  return {
    // State
    loading,
    saving,
    errorText,
    query,
    categories,
    groups,
    linkCategoryId,
    linkUrl,
    linkTitle,
    linkDescription,
    editState,
    items,
    total,
    page,
    pageSize,
    hasMore,
    fieldErrors,

    // Getters
    groupedCategoryOptions,
    selectedItem,
    hasPendingEditChanges,
    actionFeedback,
    actionFeedbackError,

    // Actions
    viewerHref,
    previewHref,
    setFieldError,
    clearFieldErrors,
    getFieldError,
    beginEdit,
    resetEdit,
    reloadTaxonomy,
    reloadItems,
    saveEdit,
    removeItem,
    submitLink,
    initialize,
    resetList,
  }
})
