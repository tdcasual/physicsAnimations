import { computed, ref, watch, type ComputedRef } from 'vue'
import { defineStore } from 'pinia'
import { loadCatalogData } from '@/features/catalog/catalogService'
import type { CatalogData, CatalogItem, CatalogGroup, CatalogCategory } from '@/features/catalog/types'
import { listLibraryCatalog } from '@/features/library/libraryApi'
import type { LibraryFolder } from '@/features/library/types'
import { readFavoriteDemos, writeFavoriteDemos, type FavoriteDemoEntry } from '@/features/catalog/favorites'
import { readRecentActivity, writeRecentActivity, type RecentActivityEntry } from '@/features/catalog/recentActivity'
import { useCatalogSearch } from '@/features/catalog/catalogSearch'
import { computeCatalogView, filterFoldersByCatalogContext } from '@/features/catalog/catalogState'
import { getCatalogItemHref } from '@/features/catalog/catalogLink'
import { DEFAULT_GROUP_ID } from '@/features/shared/constants'
import { parseViewState, serializeViewState, resolveEntries, pruneEntries } from '@/features/catalog/catalogStoreHelpers'

const VIEW_STATE_KEY = 'pa_view_state_v2'
const MAX_GROUP_TABS = 8
const MAX_CATEGORY_TABS = 10
const MAX_QUICK_CATEGORIES = 4
const MAX_FEATURED_ITEMS = 4
const MAX_LIBRARY_HIGHLIGHTS = 3
const MAX_TEACHER_QUICK_ACCESS_ITEMS = 4

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

export const useCatalogStore = defineStore('catalog', () => {
  const loading = ref(false)
  const loadError = ref('')
  const query = useCatalogSearch()
  const selectedGroupId = ref(DEFAULT_GROUP_ID)
  const selectedCategoryId = ref('all')
  const catalog = ref<CatalogData>({ groups: {} })
  const libraryFolders = ref<LibraryFolder[]>([])
  const recentEntries = ref<RecentActivityEntry[]>([])
  const favoriteEntries = ref<FavoriteDemoEntry[]>([])

  function persistViewState() {
    try {
      localStorage.setItem(VIEW_STATE_KEY, serializeViewState({
        groupId: selectedGroupId.value,
        categoryId: selectedCategoryId.value,
        query: query.value,
      }))
    } catch { /* ignore */ }
  }

  function readViewState() {
    try { return parseViewState(localStorage.getItem(VIEW_STATE_KEY)) } catch { return null }
  }

  const view = computed(() => computeCatalogView({
    catalog: catalog.value,
    selectedGroupId: selectedGroupId.value,
    selectedCategoryId: selectedCategoryId.value,
    query: query.value,
  }))

  const activeGroup: ComputedRef<CatalogGroup | null> = computed(() =>
    view.value.groups.find(g => g.id === view.value.activeGroupId) ?? view.value.groups[0] ?? null
  )

  const activeCategory: ComputedRef<CatalogCategory | null> = computed(() =>
    view.value.categories.find(c => c.id === view.value.activeCategoryId) ?? null
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
    const activeGroupCategoryIds = new Set(view.value.categories.map(c => c.id))
    return filterFoldersByCatalogContext({
      folders: libraryFolders.value,
      activeCategoryId: view.value.activeCategoryId,
      activeGroupCategoryIds,
      query: query.value,
    })
  })

  const currentItems = computed(() => view.value.items.slice(0, MAX_FEATURED_ITEMS))
  const recommendedItems = computed(() => view.value.items.slice(MAX_FEATURED_ITEMS, MAX_FEATURED_ITEMS * 2))
  const libraryHighlights = computed(() => filteredLibraryFolders.value.slice(0, MAX_LIBRARY_HIGHLIGHTS))

  const teacherQuickAccess = computed(() => {
    const itemById = new Map((view.value.items || []).map(item => [item.id, item]))
    const recent = resolveEntries(recentEntries.value, itemById, 'lastViewedAt')
    const favorites = resolveEntries(favoriteEntries.value, itemById, 'favoritedAt')
    return {
      recentItems: recent.resolvedItems.slice(0, MAX_TEACHER_QUICK_ACCESS_ITEMS),
      favoriteItems: favorites.resolvedItems.slice(0, MAX_TEACHER_QUICK_ACCESS_ITEMS),
      prunedRecentEntries: recent.validEntries,
      prunedFavoriteEntries: favorites.validEntries,
    }
  })

  const recentItems = computed(() => teacherQuickAccess.value.recentItems)
  const favoriteItems = computed(() => teacherQuickAccess.value.favoriteItems)
  const favoriteIds = computed(() => new Set(teacherQuickAccess.value.prunedFavoriteEntries.map(e => e.id)))
  const heroTitle = computed(() => activeCategory.value?.title || activeGroup.value?.title || '学科')

  function getItemHref(item: CatalogItem) { return getCatalogItemHref(item) }

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

  function pruneInvalidEntries(items: CatalogItem[]) {
    const itemIds = new Set(items.map(item => item.id))
    recentEntries.value = pruneEntries(recentEntries.value, itemIds, writeRecentActivity)
    favoriteEntries.value = pruneEntries(favoriteEntries.value, itemIds, writeFavoriteDemos)
  }

  function addRecentItem(itemId: string) {
    const now = Date.now()
    const idx = recentEntries.value.findIndex(e => e.id === itemId)
    if (idx >= 0) {
      const updated = { ...recentEntries.value[idx], lastViewedAt: now }
      recentEntries.value = [...recentEntries.value.slice(0, idx), updated, ...recentEntries.value.slice(idx + 1)]
    } else {
      recentEntries.value = [{ id: itemId, lastViewedAt: now }, ...recentEntries.value]
    }
    writeRecentActivity(recentEntries.value)
  }

  function toggleFavorite(itemId: string) {
    const idx = favoriteEntries.value.findIndex(e => e.id === itemId)
    if (idx >= 0) {
      favoriteEntries.value = [...favoriteEntries.value.slice(0, idx), ...favoriteEntries.value.slice(idx + 1)]
    } else {
      favoriteEntries.value = [{ id: itemId, favoritedAt: Date.now() }, ...favoriteEntries.value]
    }
    writeFavoriteDemos(favoriteEntries.value)
  }

  function isFavorite(itemId: string) { return favoriteIds.value.has(itemId) }

  async function loadCatalog() {
    loading.value = true
    loadError.value = ''
    try {
      const result = await loadCatalogData()
      catalog.value = result.catalog
      if (!result.ok) { loadError.value = '加载目录失败，请稍后重试。'; return false }
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
    } finally { loading.value = false }
  }

  async function loadLibraryFolders() {
    try {
      const catalog = await listLibraryCatalog().catch(() => ({ folders: [] }))
      libraryFolders.value = Array.isArray(catalog.folders) ? catalog.folders : []
    } catch { libraryFolders.value = [] }
  }

  async function initialize() {
    const saved = readViewState()
    if (saved) {
      selectedGroupId.value = saved.groupId
      selectedCategoryId.value = saved.categoryId
      query.value = saved.query
    }
    loading.value = true
    loadError.value = ''
    try {
      const result = await loadCatalogData()
      catalog.value = result.catalog
      if (!result.ok) { loadError.value = '加载目录失败，请稍后重试。'; return }
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
      pruneInvalidEntries(nextView.items)
    } catch {
      loadError.value = '初始化目录失败，请刷新页面重试。'
    } finally { loading.value = false }
  }

  watch(query, persistViewState)

  return {
    loading, loadError, query, selectedGroupId, selectedCategoryId,
    catalog, libraryFolders, recentEntries, favoriteEntries,
    view, groups, categories, items, activeGroup, activeCategory,
    directGroups, overflowGroups, directCategories, overflowCategories, quickCategories, hasCatalogGroups,
    filteredLibraryFolders, currentItems, recommendedItems, libraryHighlights,
    teacherQuickAccess, recentItems, favoriteItems, favoriteIds, heroTitle,
    getItemHref, selectGroup, selectCategory, setQuery, refreshTeacherQuickAccess,
    addRecentItem, toggleFavorite, isFavorite, loadCatalog, loadLibraryFolders, initialize,
  }
})
