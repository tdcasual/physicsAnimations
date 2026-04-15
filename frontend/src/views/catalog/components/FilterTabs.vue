<script setup lang="ts">
import type { CatalogCategory, CatalogGroup } from "@/features/catalog/types";

interface FilterTabsProps {
  groups: CatalogGroup[];
  categories: CatalogCategory[];
  activeGroupId: string;
  activeCategoryId: string;
}

defineProps<FilterTabsProps>();

defineEmits<{
  (e: "selectGroup", groupId: string): void;
  (e: "selectCategory", categoryId: string): void;
}>();
</script>

<template>
  <div class="cat-filter-tabs flex flex-col gap-4">
    <!-- Empty state skeleton -->
    <div v-if="groups.length === 0" class="flex items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="h-8 w-20 animate-pulse bg-gray-100 rounded" />
        <div class="h-8 w-24 animate-pulse bg-gray-100 rounded" />
        <div class="h-8 w-16 animate-pulse bg-gray-100 rounded" />
      </div>
    </div>
    
    <!-- Group Tabs -->
    <div v-else class="cat-tab-row cat-group-tabs flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        v-for="(group, index) in groups"
        :key="group.id"
        type="button"
        class="cat-tab cat-group-tab shrink-0 transition-all duration-300"
        :class="{ 'is-active': activeGroupId === group.id }"
        :style="{ '--tab-index': index }"
        @click="$emit('selectGroup', group.id)"
      >
        {{ group.title || group.id }}
      </button>
    </div>

    <!-- Category Tabs - Secondary level -->
    <div v-if="categories.length > 0 && groups.length > 0" class="cat-tab-row cat-category-tabs flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        type="button"
        class="cat-tab cat-category-tab shrink-0 transition-all duration-300"
        :class="{ 'is-active': activeCategoryId === 'all' }"
        @click="$emit('selectCategory', 'all')"
      >
        全部
      </button>
      <button
        v-for="(category, index) in categories"
        :key="category.id"
        type="button"
        class="cat-tab cat-category-tab shrink-0 transition-all duration-300"
        :class="{ 'is-active': activeCategoryId === category.id }"
        :style="{ '--tab-index': index }"
        @click="$emit('selectCategory', category.id)"
      >
        {{ category.title || category.id }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ===== 基础样式（极简主题） ===== */
.cat-filter-tabs {
  color: var(--cat-text-primary, #1a1a1a);
}

.cat-tab-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cat-tab {
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 300;
  letter-spacing: 0.025em;
  color: var(--cat-text-secondary, #666666);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--cat-border-radius, 4px);
  cursor: pointer;
  white-space: nowrap;
}

.cat-tab:hover {
  color: var(--cat-text-primary, #1a1a1a);
}

.cat-tab.is-active {
  color: var(--cat-text-primary, #1a1a1a);
  background: var(--cat-bg-secondary, #f8f8f8);
}

.cat-category-tab {
  padding: 6px 12px;
  font-size: 0.75rem;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* ===== 手绘风 (handdrawn) ===== */
[data-catalog-theme="handdrawn"] .cat-tab-row {
  gap: 8px;
}

[data-catalog-theme="handdrawn"] .cat-tab {
  border: 2px solid transparent;
  border-radius: var(--cat-border-radius);
  color: var(--cat-text-secondary);
  font-weight: 400;
  transform: rotate(var(--tab-rotation, 0deg));
  transition: all var(--cat-transition-fast);
}

/* 为每个按钮添加略微不同的旋转 */
[data-catalog-theme="handdrawn"] .cat-tab:nth-child(odd) {
  --tab-rotation: -0.5deg;
}

[data-catalog-theme="handdrawn"] .cat-tab:nth-child(even) {
  --tab-rotation: 0.5deg;
}

[data-catalog-theme="handdrawn"] .cat-tab:hover {
  border-color: var(--cat-border-color);
  box-shadow: var(--cat-shadow-sm);
  transform: rotate(0deg) translateY(-1px);
}

[data-catalog-theme="handdrawn"] .cat-tab.is-active {
  border-color: var(--cat-border-color-strong);
  background: var(--cat-bg-card);
  box-shadow: var(--cat-shadow);
  color: var(--cat-text-primary);
  transform: rotate(0deg);
}

[data-catalog-theme="handdrawn"] .cat-group-tab {
  font-family: var(--cat-font-body);
  font-weight: 500;
}

[data-catalog-theme="handdrawn"] .cat-category-tab {
  font-family: var(--cat-font-body);
  border-width: 1px;
}

/* ===== 新粗野主义 (brutalist) ===== */
[data-catalog-theme="brutalist"] .cat-tab-row {
  gap: 0;
}

[data-catalog-theme="brutalist"] .cat-tab {
  border: 3px solid #000;
  border-radius: 0;
  background: #fff;
  color: #000;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-left: -3px;
  position: relative;
}

[data-catalog-theme="brutalist"] .cat-tab:first-child {
  margin-left: 0;
}

[data-catalog-theme="brutalist"] .cat-tab:hover {
  background: #000;
  color: #fff;
  z-index: 1;
}

[data-catalog-theme="brutalist"] .cat-tab.is-active {
  background: #000;
  color: #fff;
  box-shadow: 3px 3px 0 #00f;
  z-index: 2;
}

[data-catalog-theme="brutalist"] .cat-category-tab {
  font-size: 0.7rem;
  padding: 4px 10px;
  border-width: 2px;
}

[data-catalog-theme="brutalist"] .cat-category-tab.is-active {
  box-shadow: 2px 2px 0 #00f;
}
</style>
