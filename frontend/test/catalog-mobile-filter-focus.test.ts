import { nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCatalogMobileFilterFocus } from '../src/views/useCatalogMobileFilterFocus'
import { mountCatalogViewChromeHarness } from './helpers/catalogViewChromeHarness'

describe('catalog mobile filter focus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('wires the extracted chrome helper through mobile refs, focus scrolling, and close-on-select behavior', async () => {
    vi.stubGlobal('window', {
      ...window,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
      innerHeight: 844,
    })

    const harness = await mountCatalogViewChromeHarness()
    const trigger = harness.host.querySelector('#catalog-trigger') as HTMLButtonElement
    const panel = harness.host.querySelector('#catalog-panel') as HTMLDivElement
    const triggerScrollIntoView = vi.fn()

    trigger.scrollIntoView = triggerScrollIntoView
    panel.getBoundingClientRect = vi.fn(
      () =>
        ({
          x: 0,
          y: 860,
          width: 320,
          height: 240,
          top: 860,
          bottom: 1100,
          left: 0,
          right: 320,
          toJSON: () => ({}),
        }) as DOMRect
    )

    harness.chrome.mobileFiltersOpen.value = true
    await nextTick()
    await nextTick()

    expect(triggerScrollIntoView).toHaveBeenCalledWith({ block: 'start', inline: 'nearest' })

    harness.chrome.chooseGroup('mechanics')
    expect(harness.selectGroup).toHaveBeenCalledWith('mechanics')
    expect(harness.chrome.mobileFiltersOpen.value).toBe(false)

    harness.chrome.mobileFiltersOpen.value = true
    harness.chrome.chooseCategory('waves')
    expect(harness.selectCategory).toHaveBeenCalledWith('waves')
    expect(harness.chrome.mobileFiltersOpen.value).toBe(false)

    harness.cleanup()
  })

  it('scrolls the mobile filter panel into view when it opens below the viewport', async () => {
    const panel = document.createElement('div')
    const trigger = document.createElement('button')
    const triggerScrollIntoView = vi.fn()
    const panelScrollIntoView = vi.fn()
    trigger.scrollIntoView = triggerScrollIntoView
    panel.scrollIntoView = panelScrollIntoView
    panel.getBoundingClientRect = vi.fn(
      () =>
        ({
          x: 0,
          y: 860,
          width: 320,
          height: 240,
          top: 860,
          bottom: 1100,
          left: 0,
          right: 320,
          toJSON: () => ({}),
        }) as DOMRect
    )

    vi.stubGlobal('window', {
      ...window,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
      innerHeight: 844,
    })

    const focus = createCatalogMobileFilterFocus({
      panelRef: ref(panel),
      triggerRef: ref(trigger),
    })

    const didScroll = await focus.focusFilterPanel()

    expect(didScroll).toBe(true)
    expect(triggerScrollIntoView).toHaveBeenCalledWith({ block: 'start', inline: 'nearest' })
    expect(panelScrollIntoView).not.toHaveBeenCalled()
  })

  it('does not scroll when the panel is already visible', async () => {
    const panel = document.createElement('div')
    const trigger = document.createElement('button')
    const triggerScrollIntoView = vi.fn()
    const panelScrollIntoView = vi.fn()
    trigger.scrollIntoView = triggerScrollIntoView
    panel.scrollIntoView = panelScrollIntoView
    panel.getBoundingClientRect = vi.fn(
      () =>
        ({
          x: 0,
          y: 120,
          width: 320,
          height: 240,
          top: 120,
          bottom: 360,
          left: 0,
          right: 320,
          toJSON: () => ({}),
        }) as DOMRect
    )

    vi.stubGlobal('window', {
      ...window,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
      innerHeight: 844,
    })

    const focus = createCatalogMobileFilterFocus({
      panelRef: ref(panel),
      triggerRef: ref(trigger),
    })

    const didScroll = await focus.focusFilterPanel()

    expect(didScroll).toBe(false)
    expect(triggerScrollIntoView).not.toHaveBeenCalled()
    expect(panelScrollIntoView).not.toHaveBeenCalled()
  })
})
