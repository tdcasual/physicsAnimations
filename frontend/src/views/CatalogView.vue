<script setup lang="ts">
import { ref } from "vue";
import { normalizePublicUrl } from "../features/catalog/catalogLink";
import { useCatalogViewState } from "../features/catalog/useCatalogViewState";

const mobileFiltersOpen = ref(false);
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
  filteredLibraryFolders,
  featuredItems,
  libraryHighlights,
  heroTitle,
  heroDescription,
  currentSectionTitle,
  getItemHref,
  selectGroup,
  selectCategory,
} = useCatalogViewState();

function getFolderHref(folderId: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/+$/, "/")}library/folder/${encodeURIComponent(folderId)}`;
}
const chooseGroup = (groupId: string) => {
  selectGroup(groupId);
  mobileFiltersOpen.value = false;
};
const chooseCategory = (categoryId: string) => {
  selectCategory(categoryId);
  mobileFiltersOpen.value = false;
};
</script>

<template>
  <section class="catalog-view">
    <div v-if="loading" class="catalog-state">正在加载作品...</div>
    <div v-else-if="loadError" class="catalog-state">{{ loadError }}</div>
    <template v-else>
      <section class="catalog-hero">
        <div class="catalog-hero-copy">
          <div class="catalog-hero-kicker">导航首页</div>
          <h1 class="catalog-hero-title">{{ heroTitle }}</h1>
          <p class="catalog-hero-description">{{ heroDescription }}</p>
        </div>
        <div class="catalog-hero-search">
          <label class="catalog-search-field">
            <span class="catalog-search-label">快速搜索</span>
            <input v-model="query" class="catalog-search" type="search" placeholder="搜索标题 / 描述..." autocomplete="off" />
          </label>
        </div>
        <div class="catalog-hero-actions">
          <a href="#catalog-current" class="btn btn-primary">继续浏览</a>
          <a href="#catalog-library" class="btn btn-ghost">浏览资源库</a>
        </div>
      </section>

      <section class="catalog-quick-access">
        <div class="catalog-section-heading">
          <h2 class="catalog-section-title">快捷入口</h2>
          <p class="catalog-section-copy">用常用分类和资源入口更快开始，而不是先在大列表里找。</p>
        </div>
        <div class="catalog-chip-list">
          <button v-for="category in quickCategories" :key="`quick-${category.id}`" type="button" class="catalog-quick-chip" @click="selectCategory(category.id)">
            常用分类 · {{ category.title }}
          </button>
          <a v-if="libraryHighlights.length" href="#catalog-library" class="catalog-quick-chip catalog-quick-chip-link">浏览资源库精选</a>
        </div>
      </section>

      <section class="catalog-section catalog-section-nav">
        <div class="catalog-section-heading">
          <h2 class="catalog-section-title">导航分组</h2>
          <p class="catalog-section-copy">先选大类，再缩小到当前课堂或浏览主题。</p>
        </div>
        <button
          type="button"
          class="catalog-mobile-filter-trigger"
          :aria-expanded="mobileFiltersOpen ? 'true' : 'false'"
          aria-controls="catalog-mobile-filter-panel"
          @click="mobileFiltersOpen = !mobileFiltersOpen"
        >
          <span>筛选导航</span>
          <span>{{ mobileFiltersOpen ? '收起' : '展开' }}</span>
        </button>
        <div id="catalog-mobile-filter-panel" class="catalog-mobile-filter-panel" :class="{ 'is-open': mobileFiltersOpen }" :aria-hidden="mobileFiltersOpen ? 'false' : 'true'">
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

      <section id="catalog-current" class="catalog-section">
        <div class="catalog-section-heading">
          <h2 class="catalog-section-title">当前分类</h2>
          <p class="catalog-section-copy">{{ currentSectionTitle }}</p>
        </div>
        <div class="catalog-card-strip">
          <a v-for="item in featuredItems" :key="`current-${item.id}`" class="catalog-card" :href="getItemHref(item)">
            <div class="catalog-thumb">
              <img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" alt="" loading="lazy" />
              <div v-else class="catalog-thumb-placeholder">{{ item.title?.slice(0, 1) || '?' }}</div>
            </div>
            <div class="catalog-card-body">
              <div class="catalog-card-title">{{ item.title }}</div>
              <div class="catalog-card-desc">{{ item.description || '点击查看详情…' }}</div>
            </div>
          </a>
        </div>
      </section>

      <section v-if="featuredItems.length" class="catalog-section">
        <div class="catalog-section-heading">
          <h2 class="catalog-section-title">推荐演示</h2>
          <p class="catalog-section-copy">优先展示当前上下文中的代表内容，适合直接进入演示。</p>
        </div>
        <div class="catalog-card-strip">
          <a v-for="item in featuredItems" :key="item.id" class="catalog-card" :href="getItemHref(item)">
            <div class="catalog-thumb">
              <img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" alt="" loading="lazy" />
              <div v-else class="catalog-thumb-placeholder">{{ item.title?.slice(0, 1) || '?' }}</div>
            </div>
            <div class="catalog-card-body">
              <div class="catalog-card-title">{{ item.title }} <small v-if="item.type === 'link'" class="catalog-link-tag">链接</small></div>
              <div class="catalog-card-desc">{{ item.description || '点击查看详情…' }}</div>
            </div>
          </a>
        </div>
      </section>

      <section id="catalog-library" v-if="libraryHighlights.length" class="catalog-section">
        <div class="catalog-section-heading">
          <h2 class="catalog-section-title">资源库精选</h2>
          <p class="catalog-section-copy">当你需要更完整的素材时，可以先从资源文件夹进入。</p>
        </div>
        <div class="catalog-card-strip">
          <a v-for="folder in libraryHighlights" :key="`library-${folder.id}`" class="catalog-card catalog-folder-card" :href="getFolderHref(folder.id)">
            <div class="catalog-thumb">
              <img v-if="folder.coverPath" :src="normalizePublicUrl(folder.coverPath)" alt="" loading="lazy" />
              <div v-else class="catalog-thumb-placeholder">文件夹</div>
            </div>
            <div class="catalog-card-body">
              <div class="catalog-card-title">{{ folder.name || folder.id }} <small class="catalog-folder-tag">文件夹</small></div>
              <div class="catalog-card-desc">{{ folder.assetCount || 0 }} 个资源</div>
            </div>
          </a>
        </div>
      </section>

      <section class="catalog-section">
        <div class="catalog-section-heading">
          <h2 class="catalog-section-title">全部内容</h2>
          <p class="catalog-section-copy">需要完整浏览时，继续从下方全部目录进入。</p>
        </div>
        <div class="catalog-grid">
          <a v-for="folder in filteredLibraryFolders" :key="`folder-${folder.id}`" class="catalog-card catalog-folder-card" :href="getFolderHref(folder.id)">
            <div class="catalog-thumb">
              <img v-if="folder.coverPath" :src="normalizePublicUrl(folder.coverPath)" alt="" loading="lazy" />
              <div v-else class="catalog-thumb-placeholder">文件夹</div>
            </div>
            <div class="catalog-card-body">
              <div class="catalog-card-title">{{ folder.name || folder.id }} <small class="catalog-folder-tag">文件夹</small></div>
              <div class="catalog-card-desc">{{ folder.assetCount || 0 }} 个资源</div>
            </div>
          </a>
          <a v-for="item in view.items" :key="item.id" class="catalog-card" :href="getItemHref(item)">
            <div class="catalog-thumb">
              <img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" alt="" loading="lazy" />
              <div v-else class="catalog-thumb-placeholder">{{ item.title?.slice(0, 1) || '?' }}</div>
            </div>
            <div class="catalog-card-body">
              <div class="catalog-card-title">{{ item.title }} <small v-if="item.type === 'link'" class="catalog-link-tag">链接</small></div>
              <div class="catalog-card-desc">{{ item.description || '点击查看详情…' }}</div>
            </div>
          </a>
          <div v-if="view.items.length === 0 && filteredLibraryFolders.length === 0" class="catalog-empty">{{ view.hasAnyItems ? '没有匹配的作品。' : '未找到任何作品。' }}</div>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped src="./CatalogView.css"></style>

<style scoped>
.catalog-card { background: var(--surface); border: 1px solid var(--border); }
.catalog-search { min-height: 44px; }
.catalog-tab { min-height: 44px; }
.catalog-card-title { flex-wrap: wrap; overflow-wrap: anywhere; }
.catalog-card-desc { overflow-wrap: anywhere; word-break: break-word; }
</style>
