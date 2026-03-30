import { describe, expect, it } from 'vitest'
import type { CatalogItem } from '../src/features/catalog/types'
import {
  getCatalogItemHref,
  isCatalogAppRoute,
  normalizePublicUrl,
} from '../src/features/catalog/catalogLink'

describe('catalog link selection', () => {
  it('prefers viewer route for external link items when href is provided', () => {
    const item: CatalogItem = {
      id: 'link-1',
      type: 'link',
      categoryId: 'other',
      title: '外链',
      description: '',
      href: '/viewer/link-1',
      src: 'https://example.com/link-1',
      thumbnail: '',
      order: 0,
    }

    expect(getCatalogItemHref(item)).toBe('/viewer/link-1')
  })

  it('prefers viewer route for upload items when href is provided', () => {
    const item: CatalogItem = {
      id: 'upload-2',
      type: 'upload',
      categoryId: 'other',
      title: '上传',
      description: '',
      href: '/viewer/upload-2',
      src: 'uploads/upload-2.html',
      thumbnail: '',
      order: 0,
    }

    expect(getCatalogItemHref(item)).toBe('/viewer/upload-2')
  })

  it('falls back to original source when viewer href is missing', () => {
    const item: CatalogItem = {
      id: 'upload-1',
      type: 'upload',
      categoryId: 'other',
      title: '上传',
      description: '',
      href: '',
      src: 'uploads/upload-1.html',
      thumbnail: '',
      order: 0,
    }

    expect(getCatalogItemHref(item)).toBe('/uploads/upload-1.html')
  })

  it('recognizes in-app catalog routes that should preserve router history context', () => {
    expect(isCatalogAppRoute('/viewer/link-1')).toBe(true)
    expect(isCatalogAppRoute('/library/folder/folder-1')).toBe(true)
    expect(isCatalogAppRoute('/content/uploads/upload-1/index.html')).toBe(false)
    expect(isCatalogAppRoute('https://example.com/demo')).toBe(false)
  })

  it('normalizes empty value to placeholder', () => {
    expect(normalizePublicUrl('')).toBe('#')
  })
})
