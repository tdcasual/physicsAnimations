import fs from 'node:fs'
import path from 'node:path'
import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAdminTaxonomyMobileEditorFocus } from '../src/views/admin/taxonomy/useAdminTaxonomyMobileEditorFocus'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

describe('admin taxonomy mobile edit focus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('wires taxonomy selection flows through mobile focus helpers', () => {
    const view = read('src/views/admin/AdminTaxonomyView.vue')

    expect(view).toMatch(/createAdminTaxonomyMobileEditorFocus/)
    expect(view).toMatch(/openGroupEditor/)
    expect(view).toMatch(/openCategoryEditor/)
    expect(view).toMatch(/@select-group="openGroupEditor\(\$event\)"/)
    expect(view).toMatch(
      /@focus-create-category="openGroupEditor\(\$event, \{ focusCreate: true \}\)"/
    )
    expect(view).toMatch(/@select-category="openCategoryEditor\(\$event\)"/)
    expect(view).toMatch(/ref="editorTopRef"/)
    expect(view).toMatch(/ref="groupEditorRef"/)
    expect(view).toMatch(/ref="categoryEditorRef"/)
  })

  it('scrolls the selected group editor into view on small screens', async () => {
    const editorTop = document.createElement('div')
    const groupEditor = document.createElement('section')
    const categoryEditor = document.createElement('section')
    const scrollIntoView = vi.fn()
    groupEditor.scrollIntoView = scrollIntoView

    vi.stubGlobal('window', {
      ...window,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    })

    const focus = createAdminTaxonomyMobileEditorFocus({
      editorTopRef: ref(editorTop),
      groupEditorRef: ref(groupEditor),
      categoryEditorRef: ref(categoryEditor),
    })

    const didScroll = await focus.focusEditorTarget('group')

    expect(didScroll).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', inline: 'nearest' })
  })

  it('falls back to the shared editor anchor when the exact editor is missing', async () => {
    const editorTop = document.createElement('div')
    const scrollIntoView = vi.fn()
    editorTop.scrollIntoView = scrollIntoView

    vi.stubGlobal('window', {
      ...window,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    })

    const focus = createAdminTaxonomyMobileEditorFocus({
      editorTopRef: ref(editorTop),
      groupEditorRef: ref<HTMLElement | null>(null),
      categoryEditorRef: ref<HTMLElement | null>(null),
    })

    const didScroll = await focus.focusEditorTarget('category')

    expect(didScroll).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', inline: 'nearest' })
  })

  it('skips auto-scroll on desktop widths', async () => {
    const editorTop = document.createElement('div')
    const groupEditor = document.createElement('section')
    const scrollIntoView = vi.fn()
    groupEditor.scrollIntoView = scrollIntoView

    vi.stubGlobal('window', {
      ...window,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    })

    const focus = createAdminTaxonomyMobileEditorFocus({
      editorTopRef: ref(editorTop),
      groupEditorRef: ref(groupEditor),
      categoryEditorRef: ref<HTMLElement | null>(null),
    })

    const didScroll = await focus.focusEditorTarget('group')

    expect(didScroll).toBe(false)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
