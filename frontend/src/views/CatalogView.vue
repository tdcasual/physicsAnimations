<script setup lang="ts">
import { computed, nextTick, ref, watch, watchEffect } from "vue";
import { onBeforeRouteLeave, RouterLink, useRoute } from "vue-router";
import {
  clearCatalogReturnScroll,
  readCatalogReturnScroll,
  resolveCatalogReturnScrollRestore,
  writeCatalogReturnScroll,
} from "../features/catalog/catalogReturnScroll";
import { isCatalogAppRoute, normalizePublicUrl } from "../features/catalog/catalogLink";
import { getCatalogHashFallbackSelector } from "../features/catalog/catalogHashTarget";
import { useCatalogViewState } from "../features/catalog/useCatalogViewState";
import { createCatalogMobileFilterFocus } from "./useCatalogMobileFilterFocus";

const heroMapItems = [
  {
    step: "01",
    title: "检索",
    description: "直接搜索标题或说明，先把课堂范围快速收窄。",
  },
  {
    step: "02",
    title: "分章",
    description: "先切大类，再收窄到当前单元或实验主题。",
  },
  {
    step: "03",
    title: "资源",
    description: "只有要原文件或下载包时，再进入资源档案。",
  },
] as const;

const mobileFiltersOpen = ref(false);
const mobileFilterTriggerRef = ref<HTMLElement | null>(null);
const mobileFilterPanelRef = ref<HTMLElement | null>(null);
const restoredCatalogReturnScrollPath = ref("");
const route = useRoute();
const {
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
  continueBrowseHref,
  secondaryBrowseHref,
  secondaryBrowseLabel,
  heroTitle,
  heroDescription,
  currentSectionTitle,
  getItemHref,
  selectGroup,
  selectCategory,
} = useCatalogViewState();

const heroOverviewCards = computed(() => [
  {
    label: "当前范围",
    title: currentSectionTitle.value || heroTitle.value,
    note: query.value.trim()
      ? `搜索词：${query.value.trim()}`
      : hasCatalogGroups.value
        ? "先在当前分组和分类里继续缩小课堂范围。"
        : "可以直接从完整目录开始浏览。",
  },
  {
    label: "优先入口",
    title: recommendedItems.value.length ? `先看 ${recommendedItems.value.length} 个推荐演示` : "继续当前内容",
    note: recommendedItems.value.length
      ? "推荐演示更贴近当前上下文，适合先进入课堂展示。"
      : "没有推荐入口时，继续浏览会直接带你去当前内容区。",
  },
  {
    label: "资源补充",
    title: libraryHighlights.value.length ? `${libraryHighlights.value.length} 个档案入口` : "按需补资源",
    note: "需要原文件、容器页或下载包时，再切去资源档案。",
  },
]);

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

function getItemKicker(type: string): string {
  return type === "link" ? "网页演示" : "本地演示";
}

function getFolderKicker(assetCount: number | undefined): string {
  return `${assetCount || 0} 项归档`;
}

const chooseGroup = (groupId: string) => {
  selectGroup(groupId);
  mobileFiltersOpen.value = false;
};

const chooseCategory = (categoryId: string) => {
  selectCategory(categoryId);
  mobileFiltersOpen.value = false;
};

const { focusFilterPanel } = createCatalogMobileFilterFocus({
  panelRef: mobileFilterPanelRef,
  triggerRef: mobileFilterTriggerRef,
});

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
  () => [loading.value, route.fullPath] as const,
  async ([isLoading, fullPath]) => {
    if (isLoading) return;
    if (restoredCatalogReturnScrollPath.value === fullPath) return;

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
  () => [loading.value, route.hash, route.fullPath] as const,
  async ([isLoading, hash, fullPath], [wasLoading, previousHash]) => {
    if (!hash || isLoading) return;
    if (restoredCatalogReturnScrollPath.value === fullPath) return;
    if (wasLoading === false && previousHash === hash) return;

    await nextTick();
    const fallbackSelector = getCatalogHashFallbackSelector(hash);
    const target = document.querySelector<HTMLElement>(hash)
      ?? (fallbackSelector ? document.querySelector<HTMLElement>(fallbackSelector) : null);
    target?.scrollIntoView();
  },
);

watchEffect(() => {
  if (loading.value) {
    document.title = "正在加载目录 - 我的学科演示集";
    return;
  }
  if (loadError.value) {
    document.title = "加载目录失败 - 我的学科演示集";
    return;
  }
  document.title = `${heroTitle.value} - 我的学科演示集`;
});
</script>

<template>
  <section class="catalog-view">
    <div v-if="loading" class="catalog-state">正在加载作品...</div>
    <div v-else-if="loadError" class="catalog-state">{{ loadError }}</div>
    <template v-else>
      <section class="catalog-hero">
        <div class="catalog-hero-copy">
          <div class="catalog-hero-kicker">教学实验图谱</div>
          <h1 class="catalog-hero-title">{{ heroTitle }}</h1>
          <p class="catalog-hero-description">{{ heroDescription }}</p>
          <p class="catalog-hero-note">先定课堂目标，再继续浏览或按需补资源。</p>
        </div>
        <div class="catalog-hero-search">
          <label class="catalog-search-field">
            <span class="catalog-search-label">快速搜索</span>
            <input v-model="query" class="catalog-search" type="search" placeholder="搜索标题 / 描述..." autocomplete="off" />
          </label>
        </div>
        <div class="catalog-hero-actions">
          <a :href="continueBrowseHref" class="btn btn-primary">继续浏览</a>
          <a :href="secondaryBrowseHref" class="btn btn-ghost">{{ secondaryBrowseLabel }}</a>
        </div>
        <div class="catalog-hero-overview" aria-label="当前浏览提示">
          <article v-for="item in heroOverviewCards" :key="item.label" class="catalog-overview-card">
            <div class="catalog-overview-label">{{ item.label }}</div>
            <strong>{{ item.title }}</strong>
            <span>{{ item.note }}</span>
          </article>
        </div>
        <div class="catalog-hero-map" aria-label="浏览地图">
          <div class="catalog-map-heading">浏览提示</div>
          <div class="catalog-map-grid">
            <article v-for="item in heroMapItems" :key="item.step" class="catalog-map-item">
              <div class="catalog-map-step">{{ item.step }}</div>
              <div class="catalog-map-copy">
                <strong>{{ item.title }}</strong>
                <span>{{ item.description }}</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section v-if="quickCategories.length || libraryHighlights.length" class="catalog-quick-access" data-tone="atlas">
        <div class="catalog-quick-access-band">
          <div class="catalog-quick-access-copy">
            <p class="catalog-quick-access-kicker">快捷入口</p>
            <h2 class="catalog-section-title catalog-quick-access-title">先从常用入口开始</h2>
            <p class="catalog-quick-access-note">把常用分类和资源入口压到一条快速开始带里，减少在大列表里的来回寻找。</p>
          </div>
          <div class="catalog-chip-list catalog-chip-list--quick">
            <button v-for="category in quickCategories" :key="`quick-${category.id}`" type="button" class="catalog-quick-chip" @click="selectCategory(category.id)">
              常用分类 · {{ category.title }}
            </button>
            <a v-if="libraryHighlights.length" href="#catalog-library" class="catalog-quick-chip catalog-quick-chip-link">浏览资源库精选</a>
          </div>
        </div>
      </section>

      <section v-if="hasCatalogGroups" class="catalog-section catalog-section-nav catalog-section--map">
        <div class="catalog-section-heading">
          <div class="catalog-section-heading-row">
            <div class="catalog-section-heading-copy">
              <h2 class="catalog-section-title">导航分组</h2>
              <p class="catalog-section-copy">先选大类，再缩小到当前课堂或浏览主题。</p>
            </div>
            <div class="catalog-section-badge">{{ directGroups.length + overflowGroups.length }} 个分组</div>
          </div>
        </div>
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
              <button
                v-for="group in directGroups"
                :key="`mobile-group-${group.id}`"
                type="button"
                class="catalog-tab"
                :class="{ active: group.id === view.activeGroupId }"
                @click="chooseGroup(group.id)"
              >
                {{ group.title }}
              </button>
              <select
                v-if="overflowGroups.length"
                class="catalog-tab catalog-select"
                :value="overflowGroups.some((group) => group.id === view.activeGroupId) ? view.activeGroupId : ''"
                @change="chooseGroup(($event.target as HTMLSelectElement).value)"
              >
                <option value="">更多…</option>
                <option v-for="group in overflowGroups" :key="group.id" :value="group.id">{{ group.title || group.id }}</option>
              </select>
            </div>
          </div>
          <div class="catalog-mobile-filter-block">
            <span class="catalog-mobile-filter-label">切换分类</span>
            <div class="catalog-mobile-filter-actions">
              <button type="button" class="catalog-tab" :class="{ active: view.activeCategoryId === 'all' }" @click="chooseCategory('all')">全部</button>
              <button
                v-for="category in directCategories"
                :key="`mobile-category-${category.id}`"
                type="button"
                class="catalog-tab"
                :class="{ active: category.id === view.activeCategoryId }"
                @click="chooseCategory(category.id)"
              >
                {{ category.title }}
              </button>
              <select
                v-if="overflowCategories.length"
                class="catalog-tab catalog-select"
                :value="overflowCategories.some((category) => category.id === view.activeCategoryId) ? view.activeCategoryId : ''"
                @change="chooseCategory(($event.target as HTMLSelectElement).value)"
              >
                <option value="">更多…</option>
                <option v-for="category in overflowCategories" :key="category.id" :value="category.id">{{ category.title || category.id }}</option>
              </select>
            </div>
          </div>
        </div>
        <nav class="catalog-tabs" aria-label="大类">
          <button v-for="group in directGroups" :key="group.id" type="button" class="catalog-tab" :class="{ active: group.id === view.activeGroupId }" @click="selectGroup(group.id)">
            {{ group.title }}
          </button>
          <select
            v-if="overflowGroups.length"
            class="catalog-tab catalog-select"
            :value="overflowGroups.some((group) => group.id === view.activeGroupId) ? view.activeGroupId : ''"
            @change="selectGroup(($event.target as HTMLSelectElement).value)"
          >
            <option value="">更多…</option>
            <option v-for="group in overflowGroups" :key="group.id" :value="group.id">{{ group.title || group.id }}</option>
          </select>
        </nav>
        <nav class="catalog-tabs" aria-label="分类">
          <button type="button" class="catalog-tab" :class="{ active: view.activeCategoryId === 'all' }" @click="selectCategory('all')">全部</button>
          <button
            v-for="category in directCategories"
            :key="category.id"
            type="button"
            class="catalog-tab"
            :class="{ active: category.id === view.activeCategoryId }"
            @click="selectCategory(category.id)"
          >
            {{ category.title }}
          </button>
          <select
            v-if="overflowCategories.length"
            class="catalog-tab catalog-select"
            :value="overflowCategories.some((category) => category.id === view.activeCategoryId) ? view.activeCategoryId : ''"
            @change="selectCategory(($event.target as HTMLSelectElement).value)"
          >
            <option value="">更多…</option>
            <option v-for="category in overflowCategories" :key="category.id" :value="category.id">{{ category.title || category.id }}</option>
          </select>
        </nav>
      </section>

      <section v-if="hasCatalogGroups && currentItems.length" id="catalog-current" class="catalog-section catalog-section--current">
        <div class="catalog-section-heading">
          <div class="catalog-section-heading-row">
            <div class="catalog-section-heading-copy">
              <h2 class="catalog-section-title">当前分类</h2>
              <p class="catalog-section-copy">{{ currentSectionTitle }}</p>
            </div>
            <div class="catalog-section-badge">{{ currentItems.length }} 个演示</div>
          </div>
        </div>
        <div class="catalog-card-strip">
          <component
            :is="getCardNavigationComponent(getItemHref(item))"
            v-for="item in currentItems"
            :key="`current-${item.id}`"
            class="catalog-card"
            v-bind="getCardNavigationProps(getItemHref(item))"
          >
            <div class="catalog-thumb">
              <img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" alt="" loading="lazy" />
              <div v-else class="catalog-thumb-placeholder">{{ item.title?.slice(0, 1) || '?' }}</div>
            </div>
            <div class="catalog-card-body">
              <div class="catalog-card-kicker">{{ getItemKicker(item.type) }}</div>
              <div class="catalog-card-title">{{ item.title }}</div>
              <div class="catalog-card-desc">{{ item.description || '点击查看详情…' }}</div>
            </div>
          </component>
        </div>
      </section>

      <section v-if="recommendedItems.length" class="catalog-section catalog-section--recommended">
        <div class="catalog-section-heading">
          <div class="catalog-section-heading-row">
            <div class="catalog-section-heading-copy">
              <h2 class="catalog-section-title">推荐演示</h2>
              <p class="catalog-section-copy">优先展示当前上下文中的代表内容，适合直接进入演示。</p>
            </div>
            <div class="catalog-section-badge">{{ recommendedItems.length }} 个入口</div>
          </div>
        </div>
        <div class="catalog-card-strip">
          <component
            :is="getCardNavigationComponent(getItemHref(item))"
            v-for="item in recommendedItems"
            :key="item.id"
            class="catalog-card"
            v-bind="getCardNavigationProps(getItemHref(item))"
          >
            <div class="catalog-thumb">
              <img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" alt="" loading="lazy" />
              <div v-else class="catalog-thumb-placeholder">{{ item.title?.slice(0, 1) || '?' }}</div>
            </div>
            <div class="catalog-card-body">
              <div class="catalog-card-kicker">{{ getItemKicker(item.type) }}</div>
              <div class="catalog-card-title">{{ item.title }} <small v-if="item.type === 'link'" class="catalog-link-tag">链接</small></div>
              <div class="catalog-card-desc">{{ item.description || '点击查看详情…' }}</div>
            </div>
          </component>
        </div>
      </section>

      <section id="catalog-library" v-if="libraryHighlights.length" class="catalog-section catalog-section--library">
        <div class="catalog-section-heading">
          <div class="catalog-section-heading-row">
            <div class="catalog-section-heading-copy">
              <h2 class="catalog-section-title">资源库精选</h2>
              <p class="catalog-section-copy">当你需要更完整的素材时，可以先从资源文件夹进入。</p>
            </div>
            <div class="catalog-section-badge">{{ libraryHighlights.length }} 个档案入口</div>
          </div>
        </div>
        <div class="catalog-card-strip">
          <component
            :is="getCardNavigationComponent(getFolderHref(folder.id))"
            v-for="folder in libraryHighlights"
            :key="`library-${folder.id}`"
            class="catalog-card catalog-folder-card"
            v-bind="getCardNavigationProps(getFolderHref(folder.id))"
          >
            <div class="catalog-thumb">
              <img v-if="folder.coverPath" :src="normalizePublicUrl(folder.coverPath)" alt="" loading="lazy" />
              <div v-else class="catalog-thumb-placeholder">文件夹</div>
            </div>
            <div class="catalog-card-body">
              <div class="catalog-card-kicker">{{ getFolderKicker(folder.assetCount) }}</div>
              <div class="catalog-card-title">{{ folder.name || folder.id }} <small class="catalog-folder-tag">文件夹</small></div>
              <div class="catalog-card-desc">{{ folder.assetCount || 0 }} 个资源</div>
            </div>
          </component>
        </div>
      </section>

      <section id="catalog-all" class="catalog-section" data-section="archive">
        <div class="catalog-section-heading">
          <div class="catalog-section-heading-row">
            <div class="catalog-section-heading-copy">
              <h2 class="catalog-section-title">全部内容</h2>
              <p class="catalog-section-copy">需要完整浏览时，继续从下方全部目录进入。</p>
            </div>
            <div class="catalog-section-badge">{{ filteredLibraryFolders.length + view.items.length }} 项总览</div>
          </div>
        </div>
        <div class="catalog-grid">
          <component
            :is="getCardNavigationComponent(getFolderHref(folder.id))"
            v-for="folder in filteredLibraryFolders"
            :key="`folder-${folder.id}`"
            class="catalog-card catalog-folder-card"
            v-bind="getCardNavigationProps(getFolderHref(folder.id))"
          >
            <div class="catalog-thumb">
              <img v-if="folder.coverPath" :src="normalizePublicUrl(folder.coverPath)" alt="" loading="lazy" />
              <div v-else class="catalog-thumb-placeholder">文件夹</div>
            </div>
            <div class="catalog-card-body">
              <div class="catalog-card-kicker">{{ getFolderKicker(folder.assetCount) }}</div>
              <div class="catalog-card-title">{{ folder.name || folder.id }} <small class="catalog-folder-tag">文件夹</small></div>
              <div class="catalog-card-desc">{{ folder.assetCount || 0 }} 个资源</div>
            </div>
          </component>
          <component
            :is="getCardNavigationComponent(getItemHref(item))"
            v-for="item in view.items"
            :key="item.id"
            class="catalog-card"
            v-bind="getCardNavigationProps(getItemHref(item))"
          >
            <div class="catalog-thumb">
              <img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" alt="" loading="lazy" />
              <div v-else class="catalog-thumb-placeholder">{{ item.title?.slice(0, 1) || '?' }}</div>
            </div>
            <div class="catalog-card-body">
              <div class="catalog-card-kicker">{{ getItemKicker(item.type) }}</div>
              <div class="catalog-card-title">{{ item.title }} <small v-if="item.type === 'link'" class="catalog-link-tag">链接</small></div>
              <div class="catalog-card-desc">{{ item.description || '点击查看详情…' }}</div>
            </div>
          </component>
          <div v-if="view.items.length === 0 && filteredLibraryFolders.length === 0" class="catalog-empty">{{ view.hasAnyItems ? '没有匹配的作品。' : '未找到任何作品。' }}</div>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped src="./CatalogView.css"></style>

<style scoped>
.catalog-search { min-height: 44px; }
.catalog-tab { min-height: 44px; }
.catalog-card-title { flex-wrap: wrap; overflow-wrap: anywhere; }
.catalog-card-desc { overflow-wrap: anywhere; word-break: break-word; }
</style>
