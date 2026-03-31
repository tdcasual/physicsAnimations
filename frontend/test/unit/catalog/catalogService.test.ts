import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest'
import {
  normalizeCatalog,
  loadCatalogData,
  DEFAULT_GROUP_ID,
  type CatalogLoadResult,
} from '../../../src/features/catalog/catalogService'

// Mock global fetch
global.fetch = vi.fn()
const mockedFetch = fetch as MockedFunction<typeof fetch>

describe('catalogService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('normalizeCatalog', () => {
    it('应返回有效的catalog对象', () => {
      const input = {
        groups: {
          physics: {
            id: 'physics',
            title: '物理',
            categories: {},
          },
        },
      }

      const result = normalizeCatalog(input)

      expect(result.groups.physics.title).toBe('物理')
    })

    it('应转换旧格式categories为groups', () => {
      const input = {
        categories: {
          mechanics: {
            id: 'mechanics',
            groupId: 'physics',
            title: '力学',
            items: [],
          },
        },
      }

      const result = normalizeCatalog(input)

      expect(result.groups[DEFAULT_GROUP_ID]).toBeDefined()
      expect(result.groups[DEFAULT_GROUP_ID].categories.mechanics).toBeDefined()
    })

    it('应处理缺少id的category', () => {
      const input = {
        categories: {
          mechanics: {
            groupId: 'physics',
            title: '力学',
          },
        },
      }

      const result = normalizeCatalog(input)

      expect(result.groups[DEFAULT_GROUP_ID].categories.mechanics.id).toBe('mechanics')
    })

    it('应处理缺少groupId的category', () => {
      const input = {
        categories: {
          mechanics: {
            id: 'mechanics',
            title: '力学',
          },
        },
      }

      const result = normalizeCatalog(input)

      expect(result.groups[DEFAULT_GROUP_ID].categories.mechanics.groupId).toBe(DEFAULT_GROUP_ID)
    })

    it('应处理缺少title的category', () => {
      const input = {
        categories: {
          mechanics: {
            id: 'mechanics',
          },
        },
      }

      const result = normalizeCatalog(input)

      expect(result.groups[DEFAULT_GROUP_ID].categories.mechanics.title).toBe('mechanics')
    })

    it('应确保items是数组', () => {
      const input = {
        categories: {
          mechanics: {
            id: 'mechanics',
            items: null,
          },
        },
      }

      const result = normalizeCatalog(input)

      expect(result.groups[DEFAULT_GROUP_ID].categories.mechanics.items).toEqual([])
    })

    it('空对象应返回空groups', () => {
      const result = normalizeCatalog({})

      expect(result.groups).toEqual({})
    })

    it('null应返回空groups', () => {
      const result = normalizeCatalog(null)

      expect(result.groups).toEqual({})
    })
  })

  describe('loadCatalogData', () => {
    it('成功时应返回ok: true和catalog', async () => {
      const mockCatalog = {
        groups: {
          physics: { id: 'physics', title: '物理', categories: {} },
        },
      }

      mockedFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockCatalog,
      } as Response)

      const result: CatalogLoadResult = await loadCatalogData()

      expect(result.ok).toBe(true)
      expect(result.catalog.groups.physics).toBeDefined()
    })

    it('应使用正确的请求参数', async () => {
      mockedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ groups: {} }),
      } as Response)

      await loadCatalogData()

      expect(mockedFetch).toHaveBeenCalledWith('/api/catalog', expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
      }))
    })

    it('HTTP错误时应使用mock数据作为fallback', async () => {
      mockedFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response)

      const result: CatalogLoadResult = await loadCatalogData()

      expect(result.ok).toBe(true)
      expect(Object.keys(result.catalog.groups).length).toBeGreaterThan(0)
    })

    it('网络错误时应使用mock数据作为fallback', async () => {
      mockedFetch.mockRejectedValue(new Error('Network error'))

      const result: CatalogLoadResult = await loadCatalogData()

      expect(result.ok).toBe(true)
      expect(Object.keys(result.catalog.groups).length).toBeGreaterThan(0)
    })
  })
})
