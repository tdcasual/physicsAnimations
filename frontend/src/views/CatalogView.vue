<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import CatalogQuickAccessBand from "../components/catalog/CatalogQuickAccessBand.vue";
import CatalogTeacherQuickAccessArea from "../components/catalog/CatalogTeacherQuickAccessArea.vue";
import { isCatalogAppRoute, normalizePublicUrl } from "../features/catalog/catalogLink";
import { toggleFavoriteDemo } from "../features/catalog/favorites";
import { useCatalogViewState } from "../features/catalog/useCatalogViewState";
import { writeBackNavigationFallbackHash } from "../features/navigation/backNavigation";
import { useCatalogViewChrome } from "./useCatalogViewChrome";

const {
  loading,
  loadError,
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
} = useCatalogViewState();

function getFolderHref(folderId: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/+$/, "/")}library/folder/${encodeURIComponent(folderId)}`;
}

function getCardNavigationComponent(href: string) {
  return isCatalogAppRoute(href) ? RouterLink : "a";
}

function getCardNavigationProps(href: string): Record<string, string> {
  return isCatalogAppRoute(href) ? { to: href } : { href };
}

function rememberWorkflowFallbackHash(hash: string) {
  writeBackNavigationFallbackHash(hash);
}

function toggleCatalogFavorite(itemId: string) {
  toggleFavoriteDemo(itemId);
  refreshTeacherQuickAccess();
}

const { mobileFiltersOpen, mobileFilterTriggerRef, mobileFilterPanelRef, chooseGroup, chooseCategory } = useCatalogViewChrome({
  loading,
  loadError,
  heroTitle,
  selectGroup,
  selectCategory,
});

const stageFeaturedKind = computed<"current" | "recommended" | "archive" | null>(() => {
  if (currentItems.value.length) return "current";
  if (recommendedItems.value.length) return "recommended";
  if (view.value.items.length) return "archive";
  return null;
});

const stageFeaturedItems = computed(() => {
  if (stageFeaturedKind.value === "current") return currentItems.value.slice(0, 4);
  if (stageFeaturedKind.value === "recommended") return recommendedItems.value.slice(0, 4);
  if (stageFeaturedKind.value === "archive") return view.value.items.slice(0, 4);
  return [];
});

const stageFeaturedTitle = computed(() => {
  if (stageFeaturedKind.value === "current") return "当前分类";
  if (stageFeaturedKind.value === "recommended") return "推荐演示";
  if (stageFeaturedKind.value === "archive") return "先从这些演示开始";
  return "";
});

const stageFeaturedCopy = computed(() => {
  if (stageFeaturedKind.value === "current") return "桌面端优先把当前筛选里的演示放到首屏，浏览时不用先穿过辅助信息区。";
  if (stageFeaturedKind.value === "recommended") return "当前分类还没形成清晰入口时，先从推荐演示进入，再继续展开完整目录。";
  if (stageFeaturedKind.value === "archive") return "当前没有前置精选时，先给出一组可直接打开的演示，避免首屏只剩导航与空状态。";
  return "";
});

const showCurrentSection = computed(() => hasCatalogGroups.value && currentItems.value.length > 0 && stageFeaturedKind.value !== "current");
const showRecommendedSection = computed(() => recommendedItems.value.length > 0 && stageFeaturedKind.value !== "recommended");
</script>

<template>
  <section class="catalog-view">
    <div v-if="loading" class="catalog-state">正在加载作品...</div>
    <div v-else-if="loadError" class="catalog-state">{{ loadError }}</div>
    <template v-else>
      <section class="catalog-stage">
        <h1 class="sr-only">{{ heroTitle }}</h1>
        <div class="catalog-stage-layout">
          <div class="catalog-stage-primary">
            <CatalogQuickAccessBand
              v-if="quickCategories.length || libraryHighlights.length"
              :quick-categories="quickCategories"
              @select-category="selectCategory"
            />

            <section v-if="stageFeaturedItems.length" class="catalog-stage-feature">
              <div class="catalog-stage-feature-head">
                <p class="catalog-stage-kicker">桌面优先浏览</p>
                <h2 class="catalog-section-title catalog-stage-feature-title">{{ stageFeaturedTitle }}</h2>
                <p class="catalog-section-copy catalog-stage-feature-copy">{{ stageFeaturedCopy }}</p>
              </div>
              <div class="catalog-card-strip catalog-card-strip--stage">
                <component
                  :is="getCardNavigationComponent(getItemHref(item))"
                  v-for="item in stageFeaturedItems"
                  :key="`stage-${item.id}`"
                  class="catalog-card"
                  v-bind="getCardNavigationProps(getItemHref(item))"
                >
                  <div class="catalog-thumb"><img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" alt="" loading="lazy" /><div v-else class="catalog-thumb-placeholder">{{ item.title?.slice(0, 2) || '?' }}</div></div>
                  <div class="catalog-card-body"><div class="catalog-card-title">{{ item.title }}</div><div v-if="item.description" class="catalog-card-desc">{{ item.description }}</div></div>
                </component>
              </div>
            </section>
          </div>

          <CatalogTeacherQuickAccessArea :recent-items="recentItems" :favorite-items="favoriteItems" :favorite-ids="favoriteIds" @open-item="rememberWorkflowFallbackHash" @toggle-favorite="toggleCatalogFavorite" />
        </div>
      </section>

      <section v-if="hasCatalogGroups" class="catalog-section catalog-section-nav catalog-section--map catalog-section--flat">
        <h2 class="catalog-section-title">导航分组</h2>
        <button
          type="button"
          ref="mobileFilterTriggerRef"
          class="catalog-mobile-filter-trigger"
          :aria-expanded="mobileFiltersOpen ? 'true' : 'false'"
          aria-controls="catalog-mobile-filter-panel"
          @click="mobileFiltersOpen = !mobileFiltersOpen"
        >
          <span>筛选导航</span>
          <span>{{ mobileFiltersOpen ? '收起' : '展开' }}</span>
        </button>
        <div ref="mobileFilterPanelRef" id="catalog-mobile-filter-panel" class="catalog-mobile-filter-panel" :class="{ 'is-open': mobileFiltersOpen }" :aria-hidden="mobileFiltersOpen ? 'false' : 'true'">
          <div class="catalog-mobile-filter-block">
            <span class="catalog-mobile-filter-label">切换大类</span>
            <div class="catalog-mobile-filter-actions">
              <button v-for="group in directGroups" :key="`mobile-group-${group.id}`" type="button" class="catalog-tab" :class="{ active: group.id === view.activeGroupId }" @click="chooseGroup(group.id)">{{ group.title }}</button>
              <select v-if="overflowGroups.length" aria-label="更多大类" class="catalog-tab catalog-select" :value="overflowGroups.some((group) => group.id === view.activeGroupId) ? view.activeGroupId : ''" @change="chooseGroup(($event.target as HTMLSelectElement).value)">
                <option value="">更多…</option>
                <option v-for="group in overflowGroups" :key="group.id" :value="group.id">{{ group.title || group.id }}</option>
              </select>
            </div>
          </div>
          <div class="catalog-mobile-filter-block">
            <span class="catalog-mobile-filter-label">切换分类</span>
            <div class="catalog-mobile-filter-actions">
              <button type="button" class="catalog-tab" :class="{ active: view.activeCategoryId === 'all' }" @click="chooseCategory('all')">全部</button>
              <button v-for="category in directCategories" :key="`mobile-category-${category.id}`" type="button" class="catalog-tab" :class="{ active: category.id === view.activeCategoryId }" @click="chooseCategory(category.id)">{{ category.title }}</button>
              <select v-if="overflowCategories.length" aria-label="更多分类" class="catalog-tab catalog-select" :value="overflowCategories.some((category) => category.id === view.activeCategoryId) ? view.activeCategoryId : ''" @change="chooseCategory(($event.target as HTMLSelectElement).value)">
                <option value="">更多…</option>
                <option v-for="category in overflowCategories" :key="category.id" :value="category.id">{{ category.title || category.id }}</option>
              </select>
            </div>
          </div>
        </div>
        <nav class="catalog-tabs" aria-label="大类">
          <button v-for="group in directGroups" :key="group.id" type="button" class="catalog-tab" :class="{ active: group.id === view.activeGroupId }" @click="selectGroup(group.id)">{{ group.title }}</button>
          <select v-if="overflowGroups.length" aria-label="更多大类" class="catalog-tab catalog-select" :value="overflowGroups.some((group) => group.id === view.activeGroupId) ? view.activeGroupId : ''" @change="selectGroup(($event.target as HTMLSelectElement).value)">
            <option value="">更多…</option>
            <option v-for="group in overflowGroups" :key="group.id" :value="group.id">{{ group.title || group.id }}</option>
          </select>
        </nav>
        <nav class="catalog-tabs" aria-label="分类">
          <button type="button" class="catalog-tab" :class="{ active: view.activeCategoryId === 'all' }" @click="selectCategory('all')">全部</button>
          <button v-for="category in directCategories" :key="category.id" type="button" class="catalog-tab" :class="{ active: category.id === view.activeCategoryId }" @click="selectCategory(category.id)">{{ category.title }}</button>
          <select v-if="overflowCategories.length" aria-label="更多分类" class="catalog-tab catalog-select" :value="overflowCategories.some((category) => category.id === view.activeCategoryId) ? view.activeCategoryId : ''" @change="selectCategory(($event.target as HTMLSelectElement).value)">
            <option value="">更多…</option>
            <option v-for="category in overflowCategories" :key="category.id" :value="category.id">{{ category.title || category.id }}</option>
          </select>
        </nav>
      </section>

      <section v-if="showCurrentSection" id="catalog-current" class="catalog-section catalog-section--current catalog-section--flat">
        <h2 class="catalog-section-title">当前分类</h2>
        <div class="catalog-card-strip">
          <component :is="getCardNavigationComponent(getItemHref(item))" v-for="item in currentItems" :key="`current-${item.id}`" class="catalog-card" v-bind="getCardNavigationProps(getItemHref(item))">
            <div class="catalog-thumb"><img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" alt="" loading="lazy" /><div v-else class="catalog-thumb-placeholder">{{ item.title?.slice(0, 2) || '?' }}</div></div>
            <div class="catalog-card-body"><div class="catalog-card-title">{{ item.title }}</div><div v-if="item.description" class="catalog-card-desc">{{ item.description }}</div></div>
          </component>
        </div>
      </section>

      <section v-if="showRecommendedSection" class="catalog-section catalog-section--recommended catalog-section--flat">
        <h2 class="catalog-section-title">推荐演示</h2>
        <div class="catalog-card-strip">
          <component :is="getCardNavigationComponent(getItemHref(item))" v-for="item in recommendedItems" :key="item.id" class="catalog-card" v-bind="getCardNavigationProps(getItemHref(item))">
            <div class="catalog-thumb"><img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" alt="" loading="lazy" /><div v-else class="catalog-thumb-placeholder">{{ item.title?.slice(0, 2) || '?' }}</div></div>
            <div class="catalog-card-body"><div class="catalog-card-title">{{ item.title }}</div><div v-if="item.description" class="catalog-card-desc">{{ item.description }}</div></div>
          </component>
        </div>
      </section>

      <section id="catalog-library" v-if="libraryHighlights.length" class="catalog-section catalog-section--library catalog-section--flat">
        <h2 class="catalog-section-title">资源库精选</h2>
        <div class="catalog-card-strip">
          <component :is="getCardNavigationComponent(getFolderHref(folder.id))" v-for="folder in libraryHighlights" :key="`library-${folder.id}`" class="catalog-card catalog-folder-card" v-bind="getCardNavigationProps(getFolderHref(folder.id))">
            <div class="catalog-thumb"><img v-if="folder.coverPath" :src="normalizePublicUrl(folder.coverPath)" alt="" loading="lazy" /><div v-else class="catalog-thumb-placeholder">文件夹</div></div>
            <div class="catalog-card-body"><div class="catalog-card-title">{{ folder.name || folder.id }}</div></div>
          </component>
        </div>
      </section>

      <section id="catalog-all" class="catalog-section" :class="'catalog-section--archive'" data-section="archive">
        <h2 class="catalog-section-title">全部内容</h2>
        <div class="catalog-grid">
          <component :is="getCardNavigationComponent(getFolderHref(folder.id))" v-for="folder in filteredLibraryFolders" :key="`folder-${folder.id}`" class="catalog-card catalog-folder-card" v-bind="getCardNavigationProps(getFolderHref(folder.id))">
            <div class="catalog-thumb"><img v-if="folder.coverPath" :src="normalizePublicUrl(folder.coverPath)" alt="" loading="lazy" /><div v-else class="catalog-thumb-placeholder">文件夹</div></div>
            <div class="catalog-card-body"><div class="catalog-card-title">{{ folder.name || folder.id }}</div></div>
          </component>
          <component :is="getCardNavigationComponent(getItemHref(item))" v-for="item in view.items" :key="item.id" class="catalog-card" v-bind="getCardNavigationProps(getItemHref(item))">
            <div class="catalog-thumb"><img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" alt="" loading="lazy" /><div v-else class="catalog-thumb-placeholder">{{ item.title?.slice(0, 2) || '?' }}</div></div>
            <div class="catalog-card-body"><div class="catalog-card-title">{{ item.title }}</div><div v-if="item.description" class="catalog-card-desc">{{ item.description }}</div></div>
          </component>
          <div v-if="view.items.length === 0 && filteredLibraryFolders.length === 0" class="catalog-empty catalog-empty--inline">{{ view.hasAnyItems ? '没有匹配的作品。' : '未找到任何作品。' }}</div>
        </div>
      </section>
    </template>
  </section>
</template>

<style src="./CatalogView.css"></style>

<style scoped>
.catalog-view {
  background: var(--surface);
  border-color: var(--border);
}

.catalog-tab { min-height: 44px; }
.catalog-card-title { flex-wrap: wrap; overflow-wrap: anywhere; }
.catalog-card-desc { overflow-wrap: anywhere; word-break: break-word; }
</style>
