import { computed, onMounted, ref, watch } from 'vue'
import { getCatalogItemHref } from './catalogLink'
import { useCatalogSearch } from './catalogSearch'
import { loadCatalogData } from './catalogService'
import { computeCatalogView, filterFoldersByCatalogContext } from './catalogState'
import type { CatalogData, CatalogItem } from './types'
import { readFavoriteDemos, type FavoriteDemoEntry, writeFavoriteDemos } from './favorites'
import { readRecentActivity, type RecentActivityEntry, writeRecentActivity } from './recentActivity'
import { listLibraryCatalog } from '../library/libraryApi'
import type { LibraryFolder } from '../library/types'

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

export function parseCatalogViewState(
  raw: string | null | undefined
): CatalogViewStateSnapshot | null {
  try {
    if (!raw) return null
    const data = JSON.parse(raw) as Record<string, unknown>
    const groupId = typeof data.groupId === 'string' ? data.groupId : ''
    const categoryId = typeof data.categoryId === 'string' ? data.categoryId : ''
    const query = typeof data.query === 'string' ? data.query : ''
    if (!groupId) return null
    return {
      groupId,
      categoryId: categoryId || 'all',
      query,
    }
  } catch {
    return null
  }
}

export function serializeCatalogViewState(snapshot: CatalogViewStateSnapshot): string {
  return JSON.stringify({
    groupId: String(snapshot.groupId || '').trim(),
    categoryId: String(snapshot.categoryId || 'all').trim() || 'all',
    query: String(snapshot.query || ''),
  })
}

export function buildCatalogHomepageSections(
  items: CatalogItem[],
  options: { currentLimit?: number; recommendedLimit?: number } = {}
): { currentItems: CatalogItem[]; recommendedItems: CatalogItem[] } {
  const currentLimit = Number(options.currentLimit || MAX_FEATURED_ITEMS)
  const recommendedLimit = Number(options.recommendedLimit || MAX_FEATURED_ITEMS)
  const currentItems = (items || []).slice(0, currentLimit)
  const recommendedItems = (items || []).slice(currentLimit, currentLimit + recommendedLimit)

  return {
    currentItems,
    recommendedItems,
  }
}

export function buildCatalogTeacherQuickAccess(
  items: CatalogItem[],
  options: {
    recentEntries?: RecentActivityEntry[]
    favoriteEntries?: FavoriteDemoEntry[]
    recentLimit?: number
    favoriteLimit?: number
  } = {}
): {
  recentItems: CatalogItem[]
  favoriteItems: CatalogItem[]
  prunedRecentEntries: RecentActivityEntry[]
  prunedFavoriteEntries: FavoriteDemoEntry[]
} {
  const itemById = new Map((items || []).map(item => [item.id, item]))
  const recentLimit = Math.max(1, Number(options.recentLimit) || MAX_TEACHER_QUICK_ACCESS_ITEMS)
  const favoriteLimit = Math.max(1, Number(options.favoriteLimit) || MAX_TEACHER_QUICK_ACCESS_ITEMS)

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

    return {
      validEntries,
      resolvedItems,
    }
  }

  const recent = resolveEntries(options.recentEntries, 'lastViewedAt')
  const favorites = resolveEntries(options.favoriteEntries, 'favoritedAt')

  return {
    recentItems: recent.resolvedItems.slice(0, recentLimit),
    favoriteItems: favorites.resolvedItems.slice(0, favoriteLimit),
    prunedRecentEntries: recent.validEntries,
    prunedFavoriteEntries: favorites.validEntries,
  }
}

function readViewState(): CatalogViewStateSnapshot | null {
  try {
    return parseCatalogViewState(localStorage.getItem(VIEW_STATE_KEY))
  } catch {
    return null
  }
}

export function useCatalogViewState() {
  const loading = ref(false)
  const loadError = ref('')
  const query = useCatalogSearch()
  const selectedGroupId = ref('physics')
  const selectedCategoryId = ref('all')
  const catalog = ref<CatalogData>({ groups: {} })
  const libraryFolders = ref<LibraryFolder[]>([])
  const recentEntries = ref<RecentActivityEntry[]>([])
  const favoriteEntries = ref<FavoriteDemoEntry[]>([])

  function persistViewState() {
    try {
      localStorage.setItem(
        VIEW_STATE_KEY,
        serializeCatalogViewState({
          groupId: selectedGroupId.value,
          categoryId: selectedCategoryId.value,
          query: query.value,
        })
      )
    } catch {
      // ignore
    }
  }

  const view = computed(() =>
    computeCatalogView({
      catalog: catalog.value,
      selectedGroupId: selectedGroupId.value,
      selectedCategoryId: selectedCategoryId.value,
      query: query.value,
    })
  )

  const activeGroup = computed(
    () =>
      view.value.groups.find(group => group.id === view.value.activeGroupId) ??
      view.value.groups[0] ??
      null
  )
  const activeCategory = computed(
    () =>
      view.value.categories.find(category => category.id === view.value.activeCategoryId) ?? null
  )

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

  const homepageSections = computed(() =>
    buildCatalogHomepageSections(view.value.items, {
      currentLimit: MAX_FEATURED_ITEMS,
      recommendedLimit: MAX_FEATURED_ITEMS,
    })
  )
  const currentItems = computed(() => homepageSections.value.currentItems)
  const recommendedItems = computed(() => homepageSections.value.recommendedItems)
  const libraryHighlights = computed(() =>
    filteredLibraryFolders.value.slice(0, MAX_LIBRARY_HIGHLIGHTS)
  )
  const teacherQuickAccess = computed(() =>
    buildCatalogTeacherQuickAccess(view.value.items, {
      recentEntries: recentEntries.value,
      favoriteEntries: favoriteEntries.value,
      recentLimit: MAX_TEACHER_QUICK_ACCESS_ITEMS,
      favoriteLimit: MAX_TEACHER_QUICK_ACCESS_ITEMS,
    })
  )
  const recentItems = computed(() => teacherQuickAccess.value.recentItems)
  const favoriteItems = computed(() => teacherQuickAccess.value.favoriteItems)
  const favoriteIds = computed(
    () => new Set(teacherQuickAccess.value.prunedFavoriteEntries.map(entry => entry.id))
  )
  const heroTitle = computed(() => {
    if (activeCategory.value) return activeCategory.value.title
    return activeGroup.value?.title || '学科'
  })

  function getItemHref(item: CatalogItem): string {
    return getCatalogItemHref(item)
  }

  function refreshTeacherQuickAccess() {
    recentEntries.value = readRecentActivity()
    favoriteEntries.value = readFavoriteDemos()
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

  watch(query, () => {
    persistViewState()
  })

  onMounted(async () => {
    const savedView = readViewState()
    if (savedView) {
      selectedGroupId.value = savedView.groupId
      selectedCategoryId.value = savedView.categoryId
      query.value = savedView.query
    }

    loading.value = true
    loadError.value = ''
    try {
      const catalogResult = await loadCatalogData()
      catalog.value = catalogResult.catalog
      if (!catalogResult.ok) {
        loadError.value = '加载目录失败，请稍后重试。'
        return
      }

      const next = computeCatalogView({
        catalog: catalog.value,
        selectedGroupId: selectedGroupId.value,
        selectedCategoryId: selectedCategoryId.value,
        query: query.value,
      })
      selectedGroupId.value = next.activeGroupId
      selectedCategoryId.value = next.activeCategoryId
      persistViewState()

      const libraryCatalog = await listLibraryCatalog().catch(() => ({ folders: [] }))
      libraryFolders.value = Array.isArray(libraryCatalog.folders) ? libraryCatalog.folders : []
      refreshTeacherQuickAccess()

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
  })

  return {
    loading,
    loadError,
    query,
    view,
    directGroups,
    overflowGroups,
    directCategories,
    overflowCategories,
    quickCategories,
    hasCatalogGroups,
    filteredLibraryFolders,
    recentItems,
    favoriteItems,
    favoriteIds,
    currentItems,
    recommendedItems,
    libraryHighlights,
    heroTitle,
    getItemHref,
    refreshTeacherQuickAccess,
    selectGroup,
    selectCategory,
  }
}
