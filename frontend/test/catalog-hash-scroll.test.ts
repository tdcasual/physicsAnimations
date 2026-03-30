import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { getCatalogHashFallbackSelector } from '../src/features/catalog/catalogHashTarget'
import { mountCatalogViewChromeHarness } from './helpers/catalogViewChromeHarness'

describe('catalog hash scroll recovery', () => {
  it('maps missing curated anchors back to the always-visible all-content section', () => {
    expect(getCatalogHashFallbackSelector('#catalog-library')).toBe('#catalog-all')
    expect(getCatalogHashFallbackSelector('#catalog-current')).toBe('#catalog-all')
    expect(getCatalogHashFallbackSelector('#catalog-all')).toBe('')
    expect(getCatalogHashFallbackSelector('#other')).toBe('')
  })

  it('reapplies hash anchor scrolling after async catalog load completes and falls back to the all-content anchor', async () => {
    const target = document.createElement('div')
    const scrollIntoView = vi.fn()

    target.id = 'catalog-all'
    target.scrollIntoView = scrollIntoView
    document.body.appendChild(target)

    const harness = await mountCatalogViewChromeHarness({
      initialPath: '/#catalog-library',
      loading: true,
    })

    harness.loading.value = false
    await nextTick()
    await nextTick()

    expect(scrollIntoView).toHaveBeenCalled()

    harness.cleanup()
    target.remove()
  })
})
