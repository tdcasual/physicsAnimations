<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { loadCatalogData } from "../features/catalog/catalogService";
import { getCatalogItemHref, normalizePublicUrl } from "../features/catalog/catalogLink";
import { computeCatalogView, filterFoldersByCatalogContext } from "../features/catalog/catalogState";
import type { CatalogData, CatalogItem } from "../features/catalog/types";
import { listLibraryCatalog } from "../features/library/libraryApi";
import type { LibraryFolder } from "../features/library/types";

const VIEW_STATE_KEY = "pa_view_state";
const MAX_GROUP_TABS = 8;
const MAX_CATEGORY_TABS = 10;

const loading = ref(false);
const loadError = ref("");
const query = ref("");
const selectedGroupId = ref("physics");
const selectedCategoryId = ref("all");
const catalog = ref<CatalogData>({ groups: {} });
const libraryFolders = ref<LibraryFolder[]>([]);

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

function getFolderHref(folderId: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/+$/, "/")}library/folder/${encodeURIComponent(folderId)}`;
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
</script>

<template>
  <section class="catalog-view">
    <div class="catalog-toolbar">
      <input
        v-model="query"
        class="catalog-search"
        type="search"
        placeholder="搜索标题 / 描述..."
        autocomplete="off"
      />
    </div>

    <nav class="catalog-tabs" aria-label="大类">
      <button
        v-for="group in directGroups"
        :key="group.id"
        type="button"
        class="catalog-tab"
        :class="{ active: group.id === view.activeGroupId }"
        @click="selectGroup(group.id)"
      >
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
      <button
        type="button"
        class="catalog-tab"
        :class="{ active: view.activeCategoryId === 'all' }"
        @click="selectCategory('all')"
      >
        全部
      </button>

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
        :value="
          overflowCategories.some((category) => category.id === view.activeCategoryId)
            ? view.activeCategoryId
            : ''
        "
        @change="selectCategory(($event.target as HTMLSelectElement).value)"
      >
        <option value="">更多…</option>
        <option v-for="category in overflowCategories" :key="category.id" :value="category.id">
          {{ category.title || category.id }}
        </option>
      </select>
    </nav>

    <div v-if="loading" class="catalog-state">正在加载作品...</div>
    <div v-else-if="loadError" class="catalog-state">{{ loadError }}</div>

    <div v-else class="catalog-grid">
      <a
        v-for="folder in filteredLibraryFolders"
        :key="`folder-${folder.id}`"
        class="catalog-card catalog-folder-card"
        :href="getFolderHref(folder.id)"
      >
        <div class="catalog-thumb">
          <img v-if="folder.coverPath" :src="normalizePublicUrl(folder.coverPath)" alt="" loading="lazy" />
          <div v-else class="catalog-thumb-placeholder">文件夹</div>
        </div>
        <div class="catalog-card-body">
          <div class="catalog-card-title">
            {{ folder.name || folder.id }}
            <small class="catalog-folder-tag">文件夹</small>
          </div>
          <div class="catalog-card-desc">{{ folder.assetCount || 0 }} 个资源</div>
        </div>
      </a>

      <a
        v-for="item in view.items"
        :key="item.id"
        class="catalog-card"
        :href="getItemHref(item)"
      >
        <div class="catalog-thumb">
          <img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" alt="" loading="lazy" />
          <div v-else class="catalog-thumb-placeholder">{{ item.title?.slice(0, 1) || "?" }}</div>
        </div>
        <div class="catalog-card-body">
          <div class="catalog-card-title">
            {{ item.title }}
            <small v-if="item.type === 'link'" class="catalog-link-tag">链接</small>
          </div>
          <div class="catalog-card-desc">{{ item.description || "点击查看详情…" }}</div>
        </div>
      </a>

      <div v-if="view.items.length === 0 && filteredLibraryFolders.length === 0" class="catalog-empty">
        {{ view.hasAnyItems ? "没有匹配的作品。" : "未找到任何作品。" }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.catalog-view {
  display: grid;
  gap: 12px;
}

.catalog-toolbar {
  display: flex;
}

.catalog-search {
  width: min(520px, 100%);
  border: 1px solid #d1d5db;
  border-radius: 999px;
  padding: 9px 12px;
  font-size: calc(14px * var(--ui-scale, 1));
}

.catalog-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.catalog-tab {
  border: 1px solid #d1d5db;
  background: #f8fafc;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  white-space: nowrap;
  font-size: calc(13px * var(--ui-scale, 1));
}

.catalog-tab.active {
  border-color: #2563eb;
  background: #dbeafe;
}

.catalog-select {
  appearance: none;
}

.catalog-state {
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  padding: 20px;
  color: #475569;
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--catalog-card-min-width, 220px), 1fr));
  gap: 14px;
}

.catalog-card {
  border: 1px solid #d1d5db;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  background: #ffffff;
}

.catalog-thumb {
  aspect-ratio: 16 / 9;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.catalog-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.catalog-thumb-placeholder {
  color: #334155;
  font-weight: 600;
}

.catalog-card-body {
  padding: 10px;
}

.catalog-card-title {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: calc(15px * var(--ui-scale, 1));
}

.catalog-link-tag {
  color: #0369a1;
  font-weight: 500;
}

.catalog-folder-card {
  border-style: dashed;
}

.catalog-folder-tag {
  color: #475569;
  font-weight: 500;
}

.catalog-card-desc {
  margin-top: 6px;
  color: #475569;
  font-size: calc(13px * var(--ui-scale, 1));
}

.catalog-empty {
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  padding: 20px;
  color: #475569;
}
</style>
