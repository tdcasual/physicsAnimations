<script setup lang="ts">
import { normalizePublicUrl } from "../features/catalog/catalogLink";
import { useCatalogViewState } from "../features/catalog/useCatalogViewState";

const {
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
} = useCatalogViewState();

function getFolderHref(folderId: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/+$/, "/")}library/folder/${encodeURIComponent(folderId)}`;
}
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
  border: 1px solid var(--border);
  border-radius: 999px;
  min-height: 44px;
  padding: 9px 12px;
  background: var(--surface);
  color: var(--text);
  font-size: calc(14px * var(--ui-scale, 1));
}

.catalog-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.catalog-tab {
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 90%, var(--bg));
  border-radius: 999px;
  padding: 6px 12px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  white-space: nowrap;
  color: var(--text);
  font-size: calc(13px * var(--ui-scale, 1));
}

.catalog-tab.active {
  border-color: color-mix(in srgb, var(--primary) 70%, var(--border));
  background: color-mix(in srgb, var(--primary) 16%, var(--surface));
}

.catalog-select {
  appearance: none;
}

.catalog-state {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 20px;
  color: var(--muted);
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--catalog-card-min-width, 220px), 1fr));
  gap: 14px;
}

.catalog-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  background: var(--surface);
}

.catalog-thumb {
  aspect-ratio: 16 / 9;
  background: color-mix(in srgb, var(--surface) 75%, var(--bg));
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
  color: var(--muted);
  font-weight: 600;
}

.catalog-card-body {
  padding: 10px;
}

.catalog-card-title {
  font-weight: 600;
  display: flex;
  align-items: flex-start; flex-wrap: wrap;
  gap: 6px;
  overflow-wrap: anywhere; word-break: break-word;
  font-size: calc(15px * var(--ui-scale, 1));
}

.catalog-link-tag {
  color: color-mix(in srgb, var(--primary) 78%, var(--text));
  font-weight: 500;
}

.catalog-folder-card {
  border-style: dashed;
}

.catalog-folder-tag {
  color: var(--muted);
  font-weight: 500;
}

.catalog-card-desc { margin-top: 6px; color: var(--muted); overflow-wrap: anywhere; word-break: break-word; font-size: calc(13px * var(--ui-scale, 1)); }

.catalog-empty {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 20px;
  color: var(--muted);
}
</style>
