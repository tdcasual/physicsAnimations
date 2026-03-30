import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAdminItemEditorState } from '../src/features/admin/composables/useAdminItemEditorState'

type AdminItem = {
  id: string
  title?: string
  description?: string
  categoryId?: string
  order?: number
  published?: boolean
  hidden?: boolean
}

describe('admin item editor state', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the selected item available from editingSnapshot when the current row falls out of the filtered list', () => {
    const items = ref<AdminItem[]>([
      {
        id: 'demo-1',
        title: 'Alpha',
        categoryId: 'mechanics',
        order: 1,
        published: true,
        hidden: false,
      },
    ])
    const editor = createAdminItemEditorState<AdminItem>({
      items,
      defaultCategoryId: 'other',
      clearFieldErrors: vi.fn(),
      setActionFeedback: vi.fn(),
    })

    editor.beginEdit(items.value[0])
    items.value = []

    expect(editor.selectedItem.value?.id).toBe('demo-1')

    editor.syncEditStateWithItems()

    expect(editor.selectedItem.value?.id).toBe('demo-1')
  })

  it('confirms before switching records when the current draft is dirty and skips the prompt for force edits', () => {
    const confirm = vi.fn(() => false)
    vi.stubGlobal('window', { ...window, confirm })

    const items = ref<AdminItem[]>([
      {
        id: 'demo-1',
        title: 'Alpha',
        categoryId: 'mechanics',
        order: 1,
        published: true,
        hidden: false,
      },
      {
        id: 'demo-2',
        title: 'Beta',
        categoryId: 'waves',
        order: 2,
        published: true,
        hidden: false,
      },
    ])
    const editor = createAdminItemEditorState<AdminItem>({
      items,
      defaultCategoryId: 'other',
      clearFieldErrors: vi.fn(),
      setActionFeedback: vi.fn(),
    })

    editor.beginEdit(items.value[0])
    editor.editTitle.value = 'Alpha revised'
    editor.beginEdit(items.value[1])

    expect(confirm).toHaveBeenCalledWith('当前编辑内容有未保存更改，确定切换吗？')
    expect(editor.editingId.value).toBe('demo-1')

    editor.beginEdit(items.value[1], { force: true })
    expect(editor.editingId.value).toBe('demo-2')
  })
})
