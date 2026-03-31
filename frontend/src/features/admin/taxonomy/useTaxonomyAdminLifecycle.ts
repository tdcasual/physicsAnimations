import { onMounted, watch, type Ref } from 'vue'
import type { TaxonomySelection } from '../taxonomyUiState'

interface UseTaxonomyAdminLifecycleParams {
  uiStateKey: string
  searchQuery: Ref<string>
  showHidden: Ref<boolean>
  openGroupIds: Ref<string[]>
  selection: Ref<TaxonomySelection | null>
  fallbackGroupId: Ref<string>
  syncSelectionAndOpenGroups: () => void
  syncFormsFromSelection: () => void
  reloadTaxonomy: () => Promise<void>
}

function toUniqueIds(ids: string[]): string[] {
  return [...new Set((ids || []).map(id => String(id || '').trim()).filter(Boolean))]
}

export function useTaxonomyAdminLifecycle(params: UseTaxonomyAdminLifecycleParams) {
  const {
    uiStateKey,
    searchQuery,
    showHidden,
    openGroupIds,
    selection,
    fallbackGroupId,
    syncSelectionAndOpenGroups,
    syncFormsFromSelection,
    reloadTaxonomy,
  } = params

  const UI_STATE_VERSION = 1

  function persistUiState() {
    const payload = {
      version: UI_STATE_VERSION,
      search: searchQuery.value,
      showHidden: showHidden.value,
      openGroups: openGroupIds.value,
      selection: selection.value,
    }
    localStorage.setItem(uiStateKey, JSON.stringify(payload))
  }

  function hydrateUiState() {
    const raw = localStorage.getItem(uiStateKey)
    if (!raw) return

    try {
      const saved = JSON.parse(raw) as {
        version?: unknown
        search?: unknown
        showHidden?: unknown
        openGroups?: unknown
        selection?: unknown
      }

      // 版本检查
      if (saved.version !== UI_STATE_VERSION) {
        // 版本不匹配，清除旧数据
        localStorage.removeItem(uiStateKey)
        return
      }

      if (typeof saved.search === 'string') searchQuery.value = saved.search
      if (typeof saved.showHidden === 'boolean') showHidden.value = saved.showHidden
      if (Array.isArray(saved.openGroups))
        openGroupIds.value = toUniqueIds(saved.openGroups as string[])

      const nextSelection = saved.selection as TaxonomySelection | null
      if (
        nextSelection &&
        typeof nextSelection === 'object' &&
        (nextSelection.kind === 'group' || nextSelection.kind === 'category') &&
        typeof nextSelection.id === 'string' &&
        nextSelection.id.trim()
      ) {
        selection.value = { kind: nextSelection.kind, id: nextSelection.id.trim() }
      }
    } catch {
      // Ignore invalid local cache.
    }
  }

  watch([searchQuery, showHidden], () => {
    const previousSelection = selection.value ? { ...selection.value } : null
    syncSelectionAndOpenGroups()
    if (
      selection.value?.kind !== previousSelection?.kind ||
      selection.value?.id !== previousSelection?.id
    ) {
      syncFormsFromSelection()
    }
  })

  // 分离简单类型和复杂类型的监听，避免不必要的 deep watch
  watch([searchQuery, showHidden, openGroupIds], persistUiState)
  watch(selection, persistUiState, { deep: true })

  onMounted(async () => {
    hydrateUiState()
    await reloadTaxonomy()
    if (!selection.value && fallbackGroupId.value) {
      selection.value = { kind: 'group', id: fallbackGroupId.value }
      syncFormsFromSelection()
    }
  })
}
