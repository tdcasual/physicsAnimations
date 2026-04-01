import { nextTick, ref, watch, watchEffect, type Ref } from "vue";
import { onBeforeRouteLeave, useRoute } from "vue-router";
import {
  clearCatalogReturnScroll,
  readCatalogReturnScroll,
  resolveCatalogReturnScrollRestore,
  writeCatalogReturnScroll,
} from "../features/catalog/catalogReturnScroll";
import { isCatalogAppRoute } from "../features/catalog/catalogLink";
import { getCatalogHashFallbackSelector } from "../features/catalog/catalogHashTarget";
import { createCatalogMobileFilterFocus } from "./useCatalogMobileFilterFocus";

export function useCatalogViewChrome(input: {
  loading: Ref<boolean>;
  loadError: Ref<string>;
  heroTitle: Ref<string>;
  selectGroup: (groupId: string) => void;
  selectCategory: (categoryId: string) => void;
}) {
  const route = useRoute();
  const mobileFiltersOpen = ref(false);
  const mobileFilterTriggerRef = ref<HTMLElement | null>(null);
  const mobileFilterPanelRef = ref<HTMLElement | null>(null);
  const restoredCatalogReturnScrollPath = ref("");
  const { focusFilterPanel } = createCatalogMobileFilterFocus({
    panelRef: mobileFilterPanelRef,
    triggerRef: mobileFilterTriggerRef,
  });

  const chooseGroup = (groupId: string) => {
    input.selectGroup(groupId);
    mobileFiltersOpen.value = false;
  };
  const chooseCategory = (categoryId: string) => {
    input.selectCategory(categoryId);
    mobileFiltersOpen.value = false;
  };

  onBeforeRouteLeave((to) => {
    if (!isCatalogAppRoute(to.fullPath)) return true;
    writeCatalogReturnScroll({
      catalogFullPath: route.fullPath,
      destinationPath: to.fullPath,
      scrollY: window.scrollY,
      timestamp: Date.now(),
    });
    return true;
  });

  watch(mobileFiltersOpen, (isOpen) => {
    if (!isOpen) return;
    void focusFilterPanel();
  });

  watch(
    () => [input.loading.value, route.fullPath] as const,
    async ([isLoading, fullPath]) => {
      if (isLoading || restoredCatalogReturnScrollPath.value === fullPath) return;
      const snapshot = resolveCatalogReturnScrollRestore({
        currentFullPath: fullPath,
        historyState: window.history.state,
        snapshot: readCatalogReturnScroll(),
      });
      if (!snapshot) return;
      restoredCatalogReturnScrollPath.value = fullPath;
      clearCatalogReturnScroll();
      await nextTick();
      window.scrollTo({ left: 0, top: snapshot.scrollY });
    },
  );

  watch(
    () => [input.loading.value, route.hash, route.fullPath] as const,
    async ([isLoading, hash, fullPath], [wasLoading, previousHash]) => {
      if (!hash || isLoading || restoredCatalogReturnScrollPath.value === fullPath) return;
      if (wasLoading === false && previousHash === hash) return;
      await nextTick();
      const fallbackSelector = getCatalogHashFallbackSelector(hash);
      const target = document.querySelector<HTMLElement>(hash)
        ?? (fallbackSelector ? document.querySelector<HTMLElement>(fallbackSelector) : null);
      target?.scrollIntoView();
    },
  );

  watchEffect(() => {
    if (input.loading.value) {
      document.title = "正在加载目录 - 我的科学演示集";
      return;
    }
    if (input.loadError.value) {
      document.title = "加载目录失败 - 我的科学演示集";
      return;
    }
    document.title = `${input.heroTitle.value} - 我的科学演示集`;
  });

  return {
    route,
    mobileFiltersOpen,
    mobileFilterTriggerRef,
    mobileFilterPanelRef,
    chooseGroup,
    chooseCategory,
  };
}
