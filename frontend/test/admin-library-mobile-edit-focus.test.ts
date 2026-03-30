import fs from 'node:fs'
import path from 'node:path'
import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAdminLibraryMobileInspectorFocus } from '../src/views/admin/library/useAdminLibraryMobileInspectorFocus'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

describe('admin library mobile edit focus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('wires folder and asset edit actions through mobile focus helpers', () => {
    const view = read('src/views/admin/AdminLibraryView.vue')
    const template = read('src/views/admin/library/AdminLibraryView.template.html')

    expect(view).toMatch(/createAdminLibraryMobileInspectorFocus/)
    expect(view).toMatch(/openFolderEditor/)
    expect(view).toMatch(/openAssetEditor/)
    expect(template).toMatch(/@click="openFolderEditor\(folder\.id\)"/)
    expect(template).toMatch(/@click="openAssetEditor\(asset\)"/)
    expect(template).toMatch(/ref="folderMetaSectionRef"/)
    expect(template).toMatch(/ref="assetEditSectionRef"/)
  })

  it('scrolls the requested inspector section into view on small screens', async () => {
    const inspectorTop = document.createElement('div')
    const folderSection = document.createElement('section')
    const assetSection = document.createElement('section')
    const scrollIntoView = vi.fn()
    folderSection.scrollIntoView = scrollIntoView

    vi.stubGlobal('window', {
      ...window,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    })

    const focus = createAdminLibraryMobileInspectorFocus({
      inspectorTopRef: ref(inspectorTop),
      folderMetaSectionRef: ref(folderSection),
      assetEditSectionRef: ref(assetSection),
    })

    const didScroll = await focus.focusInspectorTarget('folder')

    expect(didScroll).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', inline: 'nearest' })
  })

  it('falls back to the inspector top anchor when the target section is unavailable', async () => {
    const inspectorTop = document.createElement('div')
    const scrollIntoView = vi.fn()
    inspectorTop.scrollIntoView = scrollIntoView

    vi.stubGlobal('window', {
      ...window,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    })

    const focus = createAdminLibraryMobileInspectorFocus({
      inspectorTopRef: ref(inspectorTop),
      folderMetaSectionRef: ref<HTMLElement | null>(null),
      assetEditSectionRef: ref<HTMLElement | null>(null),
    })

    const didScroll = await focus.focusInspectorTarget('asset')

    expect(didScroll).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', inline: 'nearest' })
  })

  it('does not auto-scroll on wide screens', async () => {
    const inspectorTop = document.createElement('div')
    const folderSection = document.createElement('section')
    const scrollIntoView = vi.fn()
    folderSection.scrollIntoView = scrollIntoView

    vi.stubGlobal('window', {
      ...window,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    })

    const focus = createAdminLibraryMobileInspectorFocus({
      inspectorTopRef: ref(inspectorTop),
      folderMetaSectionRef: ref(folderSection),
      assetEditSectionRef: ref<HTMLElement | null>(null),
    })

    const didScroll = await focus.focusInspectorTarget('folder')

    expect(didScroll).toBe(false)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
