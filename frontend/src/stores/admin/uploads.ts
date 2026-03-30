import { computed, ref, type ComputedRef } from 'vue'
import { defineStore } from 'pinia'
import {
  type AdminItemRow,
  listItems,
  listTaxonomy,
  updateItem,
  deleteItem,
  uploadHtmlItem,
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

interface UploadEditState {
  id: string | null
  title: string
  description: string
  categoryId: string
  order: number
  published: boolean
  hidden: boolean
}

/**
 * 上传管理 Store
 *
 * 管理 HTML/ZIP 上传文件的 CRUD 操作
 */
export const useUploadAdminStore = defineStore('admin/uploads', () => {
  // State
  const loading = ref(false)
  const saving = ref(false)
  const errorText = ref('')
  const query = ref('')
  const groups = ref<GroupRow[]>([])
  const categories = ref<CategoryRow[]>([])

  // Upload form
  const categoryId = ref('other')
  const file = ref<File | null>(null)
  const uploadTitle = ref('')
  const uploadDescription = ref('')

  // Edit state
  const editState = ref<UploadEditState>({
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
  const categoryOptions: ComputedRef<{ value: string; label: string }[]> = computed(() => {
    const groupMap = new Map(groups.value.map(group => [group.id, group.title]))
    return categories.value.map(category => ({
      value: category.id,
      label: `${groupMap.get(category.groupId) || category.groupId} / ${category.title}`,
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

  function onSelectFile(nextFile: File | null) {
    file.value = nextFile
    if (file.value) clearFieldErrors('uploadFile')
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

  async function reloadUploads(options: { reset?: boolean } = {}) {
    const seq = nextRequestSeq()
    loading.value = true
    errorText.value = ''
    try {
      const result = await listItems({
        page: options.reset ? 1 : page.value,
        pageSize: pageSize,
        query: query.value,
        type: 'upload',
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
      await reloadUploads({ reset: true })
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
      await reloadUploads({ reset: true })
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

  function buildRiskConfirmMessage(details: any): string {
    const findings = Array.isArray(details?.findings) ? details.findings : []
    if (findings.length === 0) return '检测到潜在风险内容，确认后继续上传。是否继续？'
    const lines = findings.slice(0, 6).map((item: any, index: number) => {
      const severity = String(item?.severity || 'unknown')
      const message = String(item?.message || '潜在风险')
      const source = item?.source ? ` (${String(item.source)})` : ''
      return `${index + 1}. [${severity}] ${message}${source}`
    })
    const truncated = details?.truncated ? '\n...（仅展示部分风险项）' : ''
    const summary =
      typeof details?.summary === 'string' && details.summary
        ? details.summary
        : `检测到 ${findings.length} 项潜在风险特征。`
    return `${summary}\n\n${lines.join('\n')}${truncated}\n\n是否仍继续上传？`
  }

  async function submitUpload(): Promise<boolean> {
    if (!file.value) {
      setFieldError('uploadFile', '请选择 HTML 或 ZIP 文件。')
      return false
    }
    clearFieldErrors('uploadFile')
    saving.value = true
    setActionFeedback('')

    try {
      const basePayload = {
        file: file.value,
        categoryId: categoryId.value,
        title: uploadTitle.value.trim(),
        description: uploadDescription.value.trim(),
      }

      try {
        await uploadHtmlItem(basePayload)
      } catch (err) {
        const e = err as { status?: number; data?: any }
        if (e?.data?.error !== 'risky_html_requires_confirmation') throw err

        const confirmed = window.confirm(buildRiskConfirmMessage(e?.data?.details))
        if (!confirmed) {
          setActionFeedback('已取消风险上传。', true)
          return false
        }
        await uploadHtmlItem({ ...basePayload, allowRiskyHtml: true })
      }

      file.value = null
      uploadTitle.value = ''
      uploadDescription.value = ''
      clearFieldErrors('uploadFile')
      await reloadUploads({ reset: true })
      setActionFeedback('上传成功。', false)
      return true
    } catch (err) {
      const e = err as { status?: number; data?: any }
      if (e?.status === 401) {
        setActionFeedback('请先登录管理员账号。', true)
        return false
      }
      if (e?.data?.error === 'missing_file') {
        setFieldError('uploadFile', '请选择 HTML 或 ZIP 文件。')
        setActionFeedback('请选择 HTML 或 ZIP 文件。', true)
        return false
      }
      if (e?.data?.error === 'invalid_file_type') {
        setFieldError('uploadFile', '仅支持上传 HTML 或 ZIP。')
        setActionFeedback('仅支持上传 HTML 或 ZIP。', true)
        return false
      }
      setActionFeedback('上传失败。', true)
      return false
    } finally {
      saving.value = false
    }
  }

  async function initialize() {
    await reloadTaxonomy().catch(() => {})
    await reloadUploads({ reset: true })
  }

  return {
    // State
    loading,
    saving,
    errorText,
    query,
    groups,
    categories,
    categoryId,
    file,
    uploadTitle,
    uploadDescription,
    editState,
    items,
    total,
    page,
    pageSize,
    hasMore,
    fieldErrors,

    // Getters
    categoryOptions,
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
    onSelectFile,
    beginEdit,
    resetEdit,
    reloadTaxonomy,
    reloadUploads,
    saveEdit,
    removeItem,
    submitUpload,
    initialize,
    resetList,
  }
})
