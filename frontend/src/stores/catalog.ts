import { computed, ref, watch, type ComputedRef } from 'vue'
import { defineStore } from 'pinia'
import { loadCatalogData } from '@/features/catalog/catalogService'
import type {
  CatalogData,
  CatalogItem,
  CatalogGroup,
  CatalogCategory,
} from '@/features/catalog/types'
import { listLibraryCatalog } from '@/features/library/libraryApi'
import type { LibraryFolder } from '@/features/library/types'
import {
  readFavoriteDemos,
  writeFavoriteDemos,
  type FavoriteDemoEntry,
} from '@/features/catalog/favorites'
import {
  readRecentActivity,
  writeRecentActivity,
  type RecentActivityEntry,
} from '@/features/catalog/recentActivity'
import { useCatalogSearch } from '@/features/catalog/catalogSearch'
import { computeCatalogView, filterFoldersByCatalogContext } from '@/features/catalog/catalogState'
import { getCatalogItemHref } from '@/features/catalog/catalogLink'

const VIEW_STATE_KEY = 'pa_view_state'
const MAX_GROUP_TABS = 8
const MAX_CATEGORY_TABS = 10
const MAX_QUICK_CATEGORIES = 4
const MAX_FEATURED_ITEMS = 4
const MAX_LIBRARY_HIGHLIGHTS = 3
const MAX_TEACHER_QUICK_ACCESS_ITEMS = 4

export interface CatalogViewStateSnapshot {
  groupId: string
  categoryId: string
  query: string
}

function parseViewState(raw: string | null | undefined): CatalogViewStateSnapshot | null {
  try {
    if (!raw) return null
    const data = JSON.parse(raw) as Record<string, unknown>
    const groupId = typeof data.groupId === 'string' ? data.groupId : ''
    const categoryId = typeof data.categoryId === 'string' ? data.categoryId : ''
    const query = typeof data.query === 'string' ? data.query : ''
    if (!groupId) return null
    return { groupId, categoryId: categoryId || 'all', query }
  } catch {
    return null
  }
}

function serializeViewState(snapshot: CatalogViewStateSnapshot): string {
  return JSON.stringify({
    groupId: String(snapshot.groupId || '').trim(),
    categoryId: String(snapshot.categoryId || 'all').trim() || 'all',
    query: String(snapshot.query || ''),
  })
}

export interface CatalogStoreState {
  loading: boolean
  loadError: string
  selectedGroupId: string
  selectedCategoryId: string
  catalog: CatalogData
  libraryFolders: LibraryFolder[]
  recentEntries: RecentActivityEntry[]
  favoriteEntries: FavoriteDemoEntry[]
}

/**
 * 目录状态管理 Store
 *
 * 管理目录数据、视图状态、搜索、最近查看和收藏
 */
export const useCatalogStore = defineStore('catalog', () => {
  // State
  const loading = ref(false)
  const loadError = ref('')
  const query = useCatalogSearch()
  const selectedGroupId = ref('physics')
  const selectedCategoryId = ref('all')
  const catalog = ref<CatalogData>({ groups: {} })
  const libraryFolders = ref<LibraryFolder[]>([])
  const recentEntries = ref<RecentActivityEntry[]>([])
  const favoriteEntries = ref<FavoriteDemoEntry[]>([])

  // Private functions
  function persistViewState() {
    try {
      localStorage.setItem(
        VIEW_STATE_KEY,
        serializeViewState({
          groupId: selectedGroupId.value,
          categoryId: selectedCategoryId.value,
          query: query.value,
        })
      )
    } catch {
      // ignore storage errors
    }
  }

  function readViewState(): CatalogViewStateSnapshot | null {
    try {
      return parseViewState(localStorage.getItem(VIEW_STATE_KEY))
    } catch {
      return null
    }
  }

  // Getters (computed)
  const view = computed(() =>
    computeCatalogView({
      catalog: catalog.value,
      selectedGroupId: selectedGroupId.value,
      selectedCategoryId: selectedCategoryId.value,
      query: query.value,
    })
  )

  const activeGroup: ComputedRef<CatalogGroup | null> = computed(
    () =>
      view.value.groups.find(group => group.id === view.value.activeGroupId) ??
      view.value.groups[0] ??
      null
  )

  const activeCategory: ComputedRef<CatalogCategory | null> = computed(
    () =>
      view.value.categories.find(category => category.id === view.value.activeCategoryId) ?? null
  )

  const groups: ComputedRef<CatalogGroup[]> = computed(() => view.value.groups)
  const categories: ComputedRef<CatalogCategory[]> = computed(() => view.value.categories)
  const items: ComputedRef<CatalogItem[]> = computed(() => view.value.items)

  const directGroups = computed(() => view.value.groups.slice(0, MAX_GROUP_TABS))
  const overflowGroups = computed(() => view.value.groups.slice(MAX_GROUP_TABS))
  const directCategories = computed(() => view.value.categories.slice(0, MAX_CATEGORY_TABS))
  const overflowCategories = computed(() => view.value.categories.slice(MAX_CATEGORY_TABS))
  const quickCategories = computed(() => view.value.categories.slice(0, MAX_QUICK_CATEGORIES))
  const hasCatalogGroups = computed(() => view.value.groups.length > 0)

  const filteredLibraryFolders = computed(() => {
    const activeGroupCategoryIds = new Set(view.value.categories.map(category => category.id))
    return filterFoldersByCatalogContext({
      folders: libraryFolders.value,
      activeCategoryId: view.value.activeCategoryId,
      activeGroupCategoryIds,
      query: query.value,
    })
  })

  const currentItems = computed(() => view.value.items.slice(0, MAX_FEATURED_ITEMS))
  const recommendedItems = computed(() =>
    view.value.items.slice(MAX_FEATURED_ITEMS, MAX_FEATURED_ITEMS * 2)
  )
  const libraryHighlights = computed(() =>
    filteredLibraryFolders.value.slice(0, MAX_LIBRARY_HIGHLIGHTS)
  )

  const teacherQuickAccess = computed(() => {
    const itemById = new Map((view.value.items || []).map(item => [item.id, item]))
    const resolveEntries = <T extends { id: string }>(
      entries: T[] | undefined,
      timestampKey: keyof T
    ): { validEntries: T[]; resolvedItems: CatalogItem[] } => {
      const seen = new Set<string>()
      const sortedEntries = [...(entries || [])].sort(
        (left, right) => Number(right[timestampKey]) - Number(left[timestampKey])
      )
      const validEntries: T[] = []
      const resolvedItems: CatalogItem[] = []
      for (const entry of sortedEntries) {
        const id = String(entry.id || '').trim()
        if (!id || seen.has(id)) continue
        seen.add(id)
        const item = itemById.get(id)
        if (!item) continue
        validEntries.push(entry)
        resolvedItems.push(item)
      }
      return { validEntries, resolvedItems }
    }
    const recent = resolveEntries(recentEntries.value, 'lastViewedAt')
    const favorites = resolveEntries(favoriteEntries.value, 'favoritedAt')
    return {
      recentItems: recent.resolvedItems.slice(0, MAX_TEACHER_QUICK_ACCESS_ITEMS),
      favoriteItems: favorites.resolvedItems.slice(0, MAX_TEACHER_QUICK_ACCESS_ITEMS),
      prunedRecentEntries: recent.validEntries,
      prunedFavoriteEntries: favorites.validEntries,
    }
  })

  const recentItems = computed(() => teacherQuickAccess.value.recentItems)
  const favoriteItems = computed(() => teacherQuickAccess.value.favoriteItems)
  const favoriteIds = computed(
    () => new Set(teacherQuickAccess.value.prunedFavoriteEntries.map(entry => entry.id))
  )

  const heroTitle = computed(() => {
    if (activeCategory.value) return activeCategory.value.title
    return activeGroup.value?.title || '学科'
  })

  // Actions
  function getItemHref(item: CatalogItem): string {
    return getCatalogItemHref(item)
  }

  function selectGroup(groupId: string) {
    if (!groupId) return
    selectedGroupId.value = groupId
    selectedCategoryId.value = 'all'
    persistViewState()
  }

  function selectCategory(categoryId: string) {
    if (!categoryId) return
    selectedCategoryId.value = categoryId
    persistViewState()
  }

  function setQuery(value: string) {
    query.value = value
    persistViewState()
  }

  function refreshTeacherQuickAccess() {
    recentEntries.value = readRecentActivity()
    favoriteEntries.value = readFavoriteDemos()
  }

  function addRecentItem(itemId: string) {
    const now = Date.now()
    const existingIndex = recentEntries.value.findIndex(entry => entry.id === itemId)
    if (existingIndex >= 0) {
      recentEntries.value[existingIndex].lastViewedAt = now
    } else {
      recentEntries.value.push({ id: itemId, lastViewedAt: now })
    }
    writeRecentActivity(recentEntries.value)
  }

  function toggleFavorite(itemId: string) {
    const index = favoriteEntries.value.findIndex(entry => entry.id === itemId)
    if (index >= 0) {
      favoriteEntries.value.splice(index, 1)
    } else {
      favoriteEntries.value.push({ id: itemId, favoritedAt: Date.now() })
    }
    writeFavoriteDemos(favoriteEntries.value)
  }

  function isFavorite(itemId: string): boolean {
    return favoriteIds.value.has(itemId)
  }

  async function loadCatalog() {
    loading.value = true
    loadError.value = ''
    try {
      const result = await loadCatalogData()
      catalog.value = result.catalog
      if (!result.ok) {
        loadError.value = '加载目录失败，请稍后重试。'
        return false
      }

      const nextView = computeCatalogView({
        catalog: catalog.value,
        selectedGroupId: selectedGroupId.value,
        selectedCategoryId: selectedCategoryId.value,
        query: query.value,
      })
      selectedGroupId.value = nextView.activeGroupId
      selectedCategoryId.value = nextView.activeCategoryId
      persistViewState()
      return true
    } catch {
      loadError.value = '加载目录失败，请稍后重试。'
      return false
    } finally {
      loading.value = false
    }
  }

  async function loadLibraryFolders() {
    try {
      const libraryCatalog = await listLibraryCatalog().catch(() => ({ folders: [] }))
      libraryFolders.value = Array.isArray(libraryCatalog.folders) ? libraryCatalog.folders : []
    } catch {
      libraryFolders.value = []
    }
  }

  async function initialize() {
    const savedView = readViewState()
    if (savedView) {
      selectedGroupId.value = savedView.groupId
      selectedCategoryId.value = savedView.categoryId
      query.value = savedView.query
    }

    loading.value = true
    loadError.value = ''
    try {
      const result = await loadCatalogData()
      catalog.value = result.catalog
      if (!result.ok) {
        loadError.value = '加载目录失败，请稍后重试。'
        return
      }

      const nextView = computeCatalogView({
        catalog: catalog.value,
        selectedGroupId: selectedGroupId.value,
        selectedCategoryId: selectedCategoryId.value,
        query: query.value,
      })
      selectedGroupId.value = nextView.activeGroupId
      selectedCategoryId.value = nextView.activeCategoryId
      persistViewState()

      await loadLibraryFolders()
      refreshTeacherQuickAccess()

      // Prune stale entries
      if (teacherQuickAccess.value.prunedRecentEntries.length !== recentEntries.value.length) {
        recentEntries.value = teacherQuickAccess.value.prunedRecentEntries
        writeRecentActivity(recentEntries.value)
      }
      if (teacherQuickAccess.value.prunedFavoriteEntries.length !== favoriteEntries.value.length) {
        favoriteEntries.value = teacherQuickAccess.value.prunedFavoriteEntries
        writeFavoriteDemos(favoriteEntries.value)
      }
    } finally {
      loading.value = false
    }
  }

  // Watch for query changes
  watch(query, persistViewState)

  return {
    // State
    loading,
    loadError,
    query,
    selectedGroupId,
    selectedCategoryId,
    catalog,
    libraryFolders,
    recentEntries,
    favoriteEntries,

    // Getters
    view,
    groups,
    categories,
    items,
    activeGroup,
    activeCategory,
    directGroups,
    overflowGroups,
    directCategories,
    overflowCategories,
    quickCategories,
    hasCatalogGroups,
    filteredLibraryFolders,
    currentItems,
    recommendedItems,
    libraryHighlights,
    teacherQuickAccess,
    recentItems,
    favoriteItems,
    favoriteIds,
    heroTitle,

    // Actions
    getItemHref,
    selectGroup,
    selectCategory,
    setQuery,
    refreshTeacherQuickAccess,
    addRecentItem,
    toggleFavorite,
    isFavorite,
    loadCatalog,
    loadLibraryFolders,
    initialize,
  }
})
