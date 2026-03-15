<script setup lang="ts">
import { RouterLink } from "vue-router";
import { isCatalogAppRoute, normalizePublicUrl } from "../../features/catalog/catalogLink";
import type { CatalogItem } from "../../features/catalog/types";
import CatalogTeacherWorkspaceEmptyState from "./CatalogTeacherWorkspaceEmptyState.vue";

const props = defineProps<{
  sectionId: string;
  title: string;
  copy: string;
  badge: string;
  items: CatalogItem[];
  emptyTitle: string;
  emptyCopy: string;
  fallbackHash: string;
  favoriteIds: Set<string>;
}>();

const emit = defineEmits<{
  (event: "open-item", hash: string): void;
  (event: "toggle-favorite", itemId: string): void;
}>();

function getItemHref(item: CatalogItem): string {
  return normalizePublicUrl(item.href || item.src || "#");
}

function getNavigationComponent(item: CatalogItem) {
  return isCatalogAppRoute(getItemHref(item)) ? RouterLink : "a";
}

function getNavigationProps(item: CatalogItem): Record<string, string> {
  const href = getItemHref(item);
  return isCatalogAppRoute(href) ? { to: href } : { href };
}

function itemKicker(item: CatalogItem): string {
  return item.type === "link" ? "网页演示" : "本地演示";
}

function isFavorited(itemId: string): boolean {
  return props.favoriteIds.has(itemId);
}
</script>

<template>
  <section :id="props.sectionId" class="catalog-section catalog-section--teacher">
    <div class="catalog-section-heading">
      <div class="catalog-section-heading-row">
        <div class="catalog-section-heading-copy">
          <h2 class="catalog-section-title">{{ props.title }}</h2>
          <p class="catalog-section-copy">{{ props.copy }}</p>
        </div>
        <div class="catalog-section-badge">{{ props.badge }}</div>
      </div>
    </div>

    <div v-if="props.items.length" class="catalog-teacher-grid">
      <article v-for="item in props.items" :key="item.id" class="catalog-card catalog-card--teacher">
        <component
          :is="getNavigationComponent(item)"
          class="catalog-teacher-link"
          v-bind="getNavigationProps(item)"
          @click="emit('open-item', props.fallbackHash)"
        >
          <div class="catalog-thumb">
            <img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" alt="" loading="lazy" />
            <div v-else class="catalog-thumb-placeholder">{{ item.title?.slice(0, 1) || "?" }}</div>
          </div>
          <div class="catalog-card-body">
            <div class="catalog-card-kicker">{{ itemKicker(item) }}</div>
            <div class="catalog-card-title">{{ item.title }}</div>
            <div class="catalog-card-desc">{{ item.description || "点击查看详情…" }}</div>
          </div>
        </component>

        <button type="button" class="catalog-teacher-action" @click="emit('toggle-favorite', item.id)">
          {{ isFavorited(item.id) ? "已收藏" : "收藏演示" }}
        </button>
      </article>
    </div>

    <CatalogTeacherWorkspaceEmptyState v-else :title="props.emptyTitle" :copy="props.emptyCopy" />
  </section>
</template>

<style scoped>
.catalog-teacher-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.catalog-card--teacher {
  display: grid;
  gap: 10px;
}

.catalog-teacher-link {
  display: grid;
  gap: 0;
  color: inherit;
  text-decoration: none;
}

.catalog-teacher-action {
  min-height: 44px;
  width: fit-content;
  border: 1px solid color-mix(in oklab, var(--line-strong) 16%, var(--border));
  border-radius: 999px;
  padding: 8px 12px;
  background: color-mix(in oklab, var(--surface) 88%, var(--paper));
  color: inherit;
  cursor: pointer;
}
</style>
