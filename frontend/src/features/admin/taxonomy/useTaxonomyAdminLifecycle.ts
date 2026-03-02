import { onMounted, watch, type Ref } from "vue";
import type { TaxonomySelection } from "../taxonomyUiState";

interface UseTaxonomyAdminLifecycleParams {
  uiStateKey: string;
  searchQuery: Ref<string>;
  showHidden: Ref<boolean>;
  openGroupIds: Ref<string[]>;
  selection: Ref<TaxonomySelection | null>;
  fallbackGroupId: Ref<string>;
  syncSelectionAndOpenGroups: () => void;
  syncFormsFromSelection: () => void;
  reloadTaxonomy: () => Promise<void>;
}

function toUniqueIds(ids: string[]): string[] {
  return [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];
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
  } = params;

  function persistUiState() {
    const payload = {
      search: searchQuery.value,
      showHidden: showHidden.value,
      openGroups: openGroupIds.value,
      selection: selection.value,
    };
    localStorage.setItem(uiStateKey, JSON.stringify(payload));
  }

  function hydrateUiState() {
    const raw = localStorage.getItem(uiStateKey);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as {
        search?: unknown;
        showHidden?: unknown;
        openGroups?: unknown;
        selection?: unknown;
      };
      if (typeof saved.search === "string") searchQuery.value = saved.search;
      if (typeof saved.showHidden === "boolean") showHidden.value = saved.showHidden;
      if (Array.isArray(saved.openGroups)) openGroupIds.value = toUniqueIds(saved.openGroups as string[]);

      const nextSelection = saved.selection as TaxonomySelection | null;
      if (
        nextSelection &&
        typeof nextSelection === "object" &&
        (nextSelection.kind === "group" || nextSelection.kind === "category") &&
        typeof nextSelection.id === "string" &&
        nextSelection.id.trim()
      ) {
        selection.value = { kind: nextSelection.kind, id: nextSelection.id.trim() };
      }
    } catch {
      // Ignore invalid local cache.
    }
  }

  watch([searchQuery, showHidden], () => {
    syncSelectionAndOpenGroups();
    syncFormsFromSelection();
  });

  watch(
    [searchQuery, showHidden, openGroupIds, selection],
    () => {
      persistUiState();
    },
    { deep: true },
  );

  onMounted(async () => {
    hydrateUiState();
    await reloadTaxonomy();
    if (!selection.value && fallbackGroupId.value) {
      selection.value = { kind: "group", id: fallbackGroupId.value };
      syncFormsFromSelection();
    }
  });
}
