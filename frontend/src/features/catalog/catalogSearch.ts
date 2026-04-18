import { ref, watch } from "vue";

const catalogQuery = ref("");
const debouncedCatalogQuery = ref("");

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(catalogQuery, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedCatalogQuery.value = value;
  }, 200);
});

export function useCatalogSearch() {
  return catalogQuery;
}

export function useDebouncedCatalogQuery() {
  return debouncedCatalogQuery;
}
