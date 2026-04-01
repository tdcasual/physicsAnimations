import { ref } from "vue";

const catalogQuery = ref("");

export function useCatalogSearch() {
  return catalogQuery;
}
