import { computed, onMounted, ref, watch } from "vue";
import { getCatalogItemHref } from "./catalogLink";
import { loadCatalogData } from "./catalogService";
import { computeCatalogView, filterFoldersByCatalogContext } from "./catalogState";
import type { CatalogData, CatalogItem } from "./types";
import { listLibraryCatalog } from "../library/libraryApi";
import type { LibraryFolder } from "../library/types";

const VIEW_STATE_KEY = "pa_view_state";
const MAX_GROUP_TABS = 8;
const MAX_CATEGORY_TABS = 10;
const MAX_QUICK_CATEGORIES = 4;
const MAX_FEATURED_ITEMS = 4;
const MAX_LIBRARY_HIGHLIGHTS = 3;

export interface CatalogViewStateSnapshot {
  groupId: string;
  categoryId: string;
  query: string;
}

export function parseCatalogViewState(raw: string | null | undefined): CatalogViewStateSnapshot | null {
  try {
    if (!raw) return null;
    const data = JSON.parse(raw) as Record<string, unknown>;
    const groupId = typeof data.groupId === "string" ? data.groupId : "";
    const categoryId = typeof data.categoryId === "string" ? data.categoryId : "";
    const query = typeof data.query === "string" ? data.query : "";
    if (!groupId) return null;
    return {
      groupId,
      categoryId: categoryId || "all",
      query,
    };
  } catch {
    return null;
  }
}

export function serializeCatalogViewState(snapshot: CatalogViewStateSnapshot): string {
  return JSON.stringify({
    groupId: String(snapshot.groupId || "").trim(),
    categoryId: String(snapshot.categoryId || "all").trim() || "all",
    query: String(snapshot.query || ""),
  });
}

export function buildCatalogHomepageSections(
  items: CatalogItem[],
  options: { currentLimit?: number; recommendedLimit?: number } = {},
): { currentItems: CatalogItem[]; recommendedItems: CatalogItem[] } {
  const currentLimit = Number(options.currentLimit || MAX_FEATURED_ITEMS);
  const recommendedLimit = Number(options.recommendedLimit || MAX_FEATURED_ITEMS);
  const currentItems = (items || []).slice(0, currentLimit);
  const recommendedItems = (items || []).slice(currentLimit, currentLimit + recommendedLimit);

  return {
    currentItems,
    recommendedItems,
  };
}

export function buildCatalogHeroActions(input: {
  currentItemsCount: number;
  libraryHighlightsCount: number;
}): {
  continueHref: string;
  secondaryHref: string;
  secondaryLabel: string;
} {
  const hasCurrentItems = Number(input.currentItemsCount || 0) > 0;
  const hasLibraryHighlights = Number(input.libraryHighlightsCount || 0) > 0;

  return {
    continueHref: hasCurrentItems
      ? "#catalog-current"
      : hasLibraryHighlights
        ? "#catalog-library"
        : "#catalog-all",
    secondaryHref: hasLibraryHighlights ? "#catalog-library" : "#catalog-all",
    secondaryLabel: hasLibraryHighlights ? "浏览资源库" : "浏览全部内容",
  };
}

function readViewState(): CatalogViewStateSnapshot | null {
  try {
    return parseCatalogViewState(localStorage.getItem(VIEW_STATE_KEY));
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
        serializeCatalogViewState({
          groupId: selectedGroupId.value,
          categoryId: selectedCategoryId.value,
          query: query.value,
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

  const activeGroup = computed(
    () => view.value.groups.find((group) => group.id === view.value.activeGroupId) ?? view.value.groups[0] ?? null,
  );
  const activeCategory = computed(
    () => view.value.categories.find((category) => category.id === view.value.activeCategoryId) ?? null,
  );

  const directGroups = computed(() => view.value.groups.slice(0, MAX_GROUP_TABS));
  const overflowGroups = computed(() => view.value.groups.slice(MAX_GROUP_TABS));
  const directCategories = computed(() => view.value.categories.slice(0, MAX_CATEGORY_TABS));
  const overflowCategories = computed(() => view.value.categories.slice(MAX_CATEGORY_TABS));
  const quickCategories = computed(() => view.value.categories.slice(0, MAX_QUICK_CATEGORIES));
  const hasCatalogGroups = computed(() => view.value.groups.length > 0);

  const filteredLibraryFolders = computed(() => {
    const activeGroupCategoryIds = new Set(view.value.categories.map((category) => category.id));
    return filterFoldersByCatalogContext({
      folders: libraryFolders.value,
      activeCategoryId: view.value.activeCategoryId,
      activeGroupCategoryIds,
      query: query.value,
    });
  });

  const homepageSections = computed(() =>
    buildCatalogHomepageSections(view.value.items, {
      currentLimit: MAX_FEATURED_ITEMS,
      recommendedLimit: MAX_FEATURED_ITEMS,
    }),
  );
  const currentItems = computed(() => homepageSections.value.currentItems);
  const recommendedItems = computed(() => homepageSections.value.recommendedItems);
  const libraryHighlights = computed(() => filteredLibraryFolders.value.slice(0, MAX_LIBRARY_HIGHLIGHTS));
  const heroActions = computed(() =>
    buildCatalogHeroActions({
      currentItemsCount: currentItems.value.length,
      libraryHighlightsCount: libraryHighlights.value.length,
    }),
  );

  const heroTitle = computed(() => {
    if (activeCategory.value) return `${activeCategory.value.title} 导航`;
    return `${activeGroup.value?.title || "学科"}导航`;
  });

  const heroDescription = computed(() => {
    if (query.value.trim()) {
      return `当前正按“${query.value.trim()}”筛选，可继续浏览当前内容，或按需切去资源档案。`;
    }
    if (activeCategory.value) {
      return `围绕 ${activeCategory.value.title} 更快进入课堂演示、资源档案和完整目录。`;
    }
    return "从分类、推荐演示和资源档案中更快定位课堂内容。";
  });

  const currentSectionTitle = computed(() => {
    if (activeCategory.value) return activeCategory.value.title;
    return `${activeGroup.value?.title || "当前分组"} 全部内容`;
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

  watch(query, () => {
    persistViewState();
  });

  onMounted(async () => {
    const savedView = readViewState();
    if (savedView) {
      selectedGroupId.value = savedView.groupId;
      selectedCategoryId.value = savedView.categoryId;
      query.value = savedView.query;
    }

    loading.value = true;
    loadError.value = "";
    try {
      const catalogResult = await loadCatalogData();
      catalog.value = catalogResult.catalog;
      if (!catalogResult.ok) {
        loadError.value = "加载目录失败，请稍后重试。";
        return;
      }

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
    quickCategories,
    hasCatalogGroups,
    filteredLibraryFolders,
    currentItems,
    recommendedItems,
    libraryHighlights,
    continueBrowseHref: computed(() => heroActions.value.continueHref),
    secondaryBrowseHref: computed(() => heroActions.value.secondaryHref),
    secondaryBrowseLabel: computed(() => heroActions.value.secondaryLabel),
    heroTitle,
    heroDescription,
    currentSectionTitle,
    getItemHref,
    selectGroup,
    selectCategory,
  };
}
