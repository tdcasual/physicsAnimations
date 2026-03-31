import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCatalogStore } from '../catalog'
import * as catalogService from '@/features/catalog/catalogService'
import * as libraryApi from '@/features/library/libraryApi'
import * as favorites from '@/features/catalog/favorites'
import * as recentActivity from '@/features/catalog/recentActivity'

// Mocks
vi.mock('@/features/catalog/catalogService')
vi.mock('@/features/library/libraryApi')
vi.mock('@/features/catalog/favorites')
vi.mock('@/features/catalog/recentActivity')

describe('useCatalogStore', () => {
  const mockCatalogData = {
    groups: {
      physics: {
        id: 'physics',
        title: '物理',
        order: 1,
        categories: {
          mechanics: {
            id: 'mechanics',
            groupId: 'physics',
            title: '力学',
            items: [
              { id: 'item1', title: '牛顿定律', categoryId: 'mechanics' },
              { id: 'item2', title: '运动学', categoryId: 'mechanics' },
            ],
          },
          electromagnetism: {
            id: 'electromagnetism',
            groupId: 'physics',
            title: '电磁学',
            items: [],
          },
        },
      },
    },
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // Clear localStorage items
    try {
      localStorage.removeItem('pa_view_state')
    } catch {
      // ignore
    }

    vi.mocked(catalogService.loadCatalogData).mockResolvedValue({
      ok: true,
      catalog: mockCatalogData as any,
    })
    vi.mocked(libraryApi.listLibraryCatalog).mockResolvedValue({ folders: [] })
    vi.mocked(favorites.readFavoriteDemos).mockReturnValue([])
    vi.mocked(recentActivity.readRecentActivity).mockReturnValue([])
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = useCatalogStore()

      expect(store.loading).toBe(false)
      expect(store.loadError).toBe('')
      expect(store.selectedGroupId).toBe('physics')
      expect(store.selectedCategoryId).toBe('all')
      expect(store.catalog.groups).toEqual({})
      expect(store.libraryFolders).toEqual([])
    })
  })

  describe('getters', () => {
    it('should compute view correctly after load', async () => {
      const store = useCatalogStore()
      await store.initialize()

      expect(store.groups).toHaveLength(1)
      expect(store.groups[0].id).toBe('physics')
      expect(store.categories).toHaveLength(2)
      expect(store.items).toHaveLength(2)
    })

    it('should compute activeGroup correctly', async () => {
      const store = useCatalogStore()
      await store.initialize()

      expect(store.activeGroup?.id).toBe('physics')
      expect(store.activeGroup?.title).toBe('物理')
    })

    it('should compute heroTitle correctly', async () => {
      const store = useCatalogStore()
      await store.initialize()

      expect(store.heroTitle).toBe('物理')

      store.selectCategory('mechanics')
      expect(store.heroTitle).toBe('力学')
    })

    it('should compute favoriteIds correctly', async () => {
      vi.mocked(favorites.readFavoriteDemos).mockReturnValue([
        { id: 'item1', favoritedAt: Date.now() },
      ])

      const store = useCatalogStore()
      await store.initialize()

      expect(store.isFavorite('item1')).toBe(true)
      expect(store.isFavorite('item2')).toBe(false)
    })
  })

  describe('actions', () => {
    it('should load catalog successfully', async () => {
      const store = useCatalogStore()
      const result = await store.loadCatalog()

      expect(result).toBe(true)
      expect(store.catalog.groups).toEqual(mockCatalogData.groups)
      expect(store.loading).toBe(false)
    })

    it('should handle catalog load failure', async () => {
      vi.mocked(catalogService.loadCatalogData).mockResolvedValue({
        ok: false,
        catalog: { groups: {} },
        error: 'request_failed',
      })

      const store = useCatalogStore()
      const result = await store.loadCatalog()

      expect(result).toBe(false)
      expect(store.loadError).toBe('加载目录失败，请稍后重试。')
    })

    it('should select group and reset category', async () => {
      const store = useCatalogStore()
      await store.initialize()

      store.selectCategory('mechanics')
      expect(store.selectedCategoryId).toBe('mechanics')

      store.selectGroup('chemistry')
      expect(store.selectedGroupId).toBe('chemistry')
      expect(store.selectedCategoryId).toBe('all')
    })

    it('should toggle favorite', async () => {
      const writeSpy = vi.mocked(favorites.writeFavoriteDemos)
      vi.mocked(favorites.readFavoriteDemos).mockReturnValue([])

      const store = useCatalogStore()
      await store.initialize()

      store.toggleFavorite('item1')
      expect(store.isFavorite('item1')).toBe(true)
      expect(writeSpy).toHaveBeenCalled()

      store.toggleFavorite('item1')
      expect(store.isFavorite('item1')).toBe(false)
    })

    it('should add recent item', async () => {
      const writeSpy = vi.mocked(recentActivity.writeRecentActivity)
      vi.mocked(recentActivity.readRecentActivity).mockReturnValue([])

      const store = useCatalogStore()
      await store.initialize()

      store.addRecentItem('item1')
      expect(store.recentEntries).toHaveLength(1)
      expect(store.recentEntries[0].id).toBe('item1')
      expect(writeSpy).toHaveBeenCalled()
    })
  })

  describe('persistence', () => {
    it('should persist view state to localStorage', async () => {
      // Skip if localStorage is not properly mocked
      if (typeof localStorage?.setItem !== 'function') {
        return
      }

      const store = useCatalogStore()
      await store.initialize()

      store.selectGroup('physics')
      store.selectCategory('mechanics')

      const saved = localStorage.getItem('pa_view_state')
      expect(saved).toBeTruthy()

      const parsed = JSON.parse(saved!)
      expect(parsed.groupId).toBe('physics')
      expect(parsed.categoryId).toBe('mechanics')
    })

    it('should restore view state from localStorage', async () => {
      // Skip if localStorage is not properly mocked
      if (typeof localStorage?.setItem !== 'function') {
        return
      }

      localStorage.setItem(
        'pa_view_state',
        JSON.stringify({ groupId: 'chemistry', categoryId: 'organic', query: 'test' })
      )

      const store = useCatalogStore()
      expect(store.selectedGroupId).toBe('physics') // Before initialize

      await store.initialize()
      // After initialize, should use catalog-validated values
      expect(store.query).toBe('test')
    })
  })
})
