<script setup lang="ts">
  import { RouterLink } from 'vue-router'
  import { isCatalogAppRoute, normalizePublicUrl } from '../../features/catalog/catalogLink'
  import type { CatalogItem } from '../../features/catalog/types'
  import CatalogTeacherWorkspaceEmptyState from './CatalogTeacherWorkspaceEmptyState.vue'

  const props = defineProps<{
    sectionId: string
    title: string
    badge: string
    items: CatalogItem[]
    emptyTitle: string
    emptyHint?: string
    fallbackHash: string
    favoriteIds: Set<string>
  }>()

  const emit = defineEmits<{
    (event: 'open-item', hash: string): void
    (event: 'toggle-favorite', itemId: string): void
  }>()

  function getItemHref(item: CatalogItem): string {
    return normalizePublicUrl(item.href || item.src || '#')
  }

  function getNavigationComponent(item: CatalogItem) {
    return isCatalogAppRoute(getItemHref(item)) ? RouterLink : 'a'
  }

  function getNavigationProps(item: CatalogItem): Record<string, string> {
    const href = getItemHref(item)
    return isCatalogAppRoute(href) ? { to: href } : { href }
  }

  function isFavorited(itemId: string): boolean {
    return props.favoriteIds.has(itemId)
  }
</script>

<template>
  <section :id="props.sectionId" class="catalog-workbench-column">
    <div class="catalog-workbench-column-head">
      <h3 class="catalog-workbench-column-title">{{ props.title }}</h3>
      <div class="catalog-workbench-column-badge">{{ props.badge }}</div>
    </div>

    <div v-if="props.items.length" class="catalog-teacher-list">
      <article v-for="item in props.items" :key="item.id" class="catalog-teacher-row">
        <component
          :is="getNavigationComponent(item)"
          class="catalog-teacher-link"
          v-bind="getNavigationProps(item)"
          @click="emit('open-item', props.fallbackHash)"
        >
          <div class="catalog-teacher-thumb">
            <img
              v-if="item.thumbnail"
              :src="normalizePublicUrl(item.thumbnail)"
              alt=""
              loading="lazy"
            />
            <div v-else class="catalog-thumb-placeholder">{{ item.title?.slice(0, 2) || '?' }}</div>
          </div>
          <div class="catalog-teacher-body">
            <div class="catalog-teacher-title">{{ item.title }}</div>
            <div v-if="item.description" class="catalog-teacher-desc">{{ item.description }}</div>
          </div>
        </component>

        <button
          type="button"
          class="catalog-teacher-action"
          :class="{ 'catalog-teacher-action--active': isFavorited(item.id) }"
          @click="emit('toggle-favorite', item.id)"
        >
          {{ isFavorited(item.id) ? '已收藏' : '收藏' }}
        </button>
      </article>
    </div>

    <CatalogTeacherWorkspaceEmptyState v-else :title="props.emptyTitle" :hint="props.emptyHint" />
  </section>
</template>

<style scoped>
  .catalog-workbench-column {
    display: grid;
    gap: 10px;
  }

  .catalog-workbench-column-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .catalog-workbench-column-title {
    margin: 0;
  }

  .catalog-workbench-column-title {
    font-size: clamp(1rem, 0.94rem + 0.2vw, 1.12rem);
    line-height: 1.12;
    min-width: 0;
  }

  .catalog-workbench-column-badge {
    flex: 0 0 auto;
    min-height: 24px;
    padding: 2px 8px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    background: transparent;
    color: var(--accent-8);
    font-size: calc(11px * var(--ui-scale, 1));
    font-weight: 600;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .catalog-teacher-list {
    display: grid;
    gap: 8px;
  }

  .catalog-teacher-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    padding: 8px 4px;
    border-top: 1px solid var(--border-default);
    border-radius: var(--radius-s);
    transition: background-color 140ms ease;
  }

  .catalog-teacher-row:hover {
    background: var(--surface-panel);
  }

  .catalog-teacher-row:first-child {
    padding-top: 0;
    border-top: 0;
  }

  .catalog-teacher-link {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    color: inherit;
    text-decoration: none;
  }

  .catalog-teacher-thumb {
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: var(--radius-m);
    background: var(--surface-bg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .catalog-teacher-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .catalog-teacher-body {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .catalog-teacher-title {
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .catalog-teacher-desc {
    color: var(--text-tertiary);
    font-size: calc(12px * var(--ui-scale, 1));
    line-height: 1.45;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  .catalog-teacher-action {
    min-height: 34px;
    width: fit-content;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    padding: 6px 10px;
    background: var(--surface-bg);
    color: inherit;
    cursor: pointer;
    font-size: calc(12px * var(--ui-scale, 1));
    font-weight: 500;
  }

  .catalog-teacher-action--active {
    border-color: var(--accent-8);
    background: oklch(58% 0.18 30 / 0.08);
    color: var(--accent-9);
    font-weight: 600;
  }

  @media (max-width: 640px) {
    .catalog-workbench-column-head {
      align-items: flex-start;
      gap: 6px;
    }

    .catalog-workbench-column-badge {
      min-height: 26px;
    }

    .catalog-teacher-row {
      grid-template-columns: 1fr;
      gap: 6px;
    }

    .catalog-teacher-link {
      grid-template-columns: 64px minmax(0, 1fr);
      gap: 8px;
    }
  }
</style>
