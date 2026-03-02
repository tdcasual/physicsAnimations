import { computed, onMounted, ref } from "vue";
import { getCatalogItemHref } from "./catalogLink";
import { loadCatalogData } from "./catalogService";
import { computeCatalogView, filterFoldersByCatalogContext } from "./catalogState";
import type { CatalogData, CatalogItem } from "./types";
import { listLibraryCatalog } from "../library/libraryApi";
import type { LibraryFolder } from "../library/types";

const VIEW_STATE_KEY = "pa_view_state";
const MAX_GROUP_TABS = 8;
const MAX_CATEGORY_TABS = 10;

function readViewState(): { groupId: string; categoryId: string } | null {
  try {
    const raw = localStorage.getItem(VIEW_STATE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Record<string, unknown>;
    const groupId = typeof data.groupId === "string" ? data.groupId : "";
    const categoryId = typeof data.categoryId === "string" ? data.categoryId : "";
    if (!groupId) return null;
    return { groupId, categoryId: categoryId || "all" };
  } catch {
    return null;
  }
}

export function useCatalogViewState() {
  const loading = ref(false);
  const loadError = ref("");
  const query = ref("");
  const selectedGroupId = ref("physics");
  const selectedCategoryId = ref("all");
  const catalog = ref<CatalogData>({ groups: {} });
  const libraryFolders = ref<LibraryFolder[]>([]);

  function persistViewState() {
    try {
      localStorage.setItem(
        VIEW_STATE_KEY,
        JSON.stringify({
          groupId: selectedGroupId.value,
          categoryId: selectedCategoryId.value,
        }),
      );
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
    }),
  );
  const directGroups = computed(() => view.value.groups.slice(0, MAX_GROUP_TABS));
  const overflowGroups = computed(() => view.value.groups.slice(MAX_GROUP_TABS));
  const directCategories = computed(() => view.value.categories.slice(0, MAX_CATEGORY_TABS));
  const overflowCategories = computed(() => view.value.categories.slice(MAX_CATEGORY_TABS));
  const filteredLibraryFolders = computed(() => {
    const activeGroupCategoryIds = new Set(view.value.categories.map((category) => category.id));
    return filterFoldersByCatalogContext({
      folders: libraryFolders.value,
      activeCategoryId: view.value.activeCategoryId,
      activeGroupCategoryIds,
      query: query.value,
    });
  });

  function getItemHref(item: CatalogItem): string {
    return getCatalogItemHref(item);
  }

  function selectGroup(groupId: string) {
    if (!groupId) return;
    selectedGroupId.value = groupId;
    selectedCategoryId.value = "all";
    persistViewState();
  }

  function selectCategory(categoryId: string) {
    if (!categoryId) return;
    selectedCategoryId.value = categoryId;
    persistViewState();
  }

  onMounted(async () => {
    const savedView = readViewState();
    if (savedView) {
      selectedGroupId.value = savedView.groupId;
      selectedCategoryId.value = savedView.categoryId;
    }

    loading.value = true;
    loadError.value = "";
    try {
      catalog.value = await loadCatalogData();

      const next = computeCatalogView({
        catalog: catalog.value,
        selectedGroupId: selectedGroupId.value,
        selectedCategoryId: selectedCategoryId.value,
        query: query.value,
      });
      selectedGroupId.value = next.activeGroupId;
      selectedCategoryId.value = next.activeCategoryId;
      persistViewState();

      const libraryCatalog = await listLibraryCatalog().catch(() => ({ folders: [] }));
      libraryFolders.value = Array.isArray(libraryCatalog.folders) ? libraryCatalog.folders : [];
    } catch {
      loadError.value = "加载目录失败，请稍后重试。";
    } finally {
      loading.value = false;
    }
  });

  return {
    loading,
    loadError,
    query,
    view,
    directGroups,
    overflowGroups,
    directCategories,
    overflowCategories,
    filteredLibraryFolders,
    getItemHref,
    selectGroup,
    selectCategory,
  };
}
