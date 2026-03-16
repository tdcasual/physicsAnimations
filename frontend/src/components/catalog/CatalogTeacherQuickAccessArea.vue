<script setup lang="ts">
import CatalogTeacherWorkspaceSummary from "./CatalogTeacherWorkspaceSummary.vue";
import type { CatalogItem } from "../../features/catalog/types";
import CatalogTeacherQuickAccessSection from "./CatalogTeacherQuickAccessSection.vue";

defineProps<{
  recentItems: CatalogItem[];
  favoriteItems: CatalogItem[];
  favoriteIds: Set<string>;
  workspaceSummary?: Array<{
    label: string;
    value: string;
    note: string;
  }>;
}>();

const emit = defineEmits<{
  (event: "open-item", hash: string): void;
  (event: "toggle-favorite", itemId: string): void;
}>();
</script>

<template>
  <section class="catalog-teacher-quick-access catalog-workbench catalog-stage-rail" aria-label="教学快捷入口">
    <div class="catalog-workbench-head">
      <p class="catalog-workbench-kicker">教学工作区</p>
    </div>
    <CatalogTeacherWorkspaceSummary v-if="workspaceSummary?.length" :summary="workspaceSummary" />
    <div class="catalog-workbench-columns">
      <CatalogTeacherQuickAccessSection
        section-id="catalog-recent"
        title="最近查看"
        :badge="recentItems.length ? `${recentItems.length}` : '待开'"
        :items="recentItems"
        empty-title="先打开一个演示"
        empty-copy=""
        fallback-hash="#catalog-recent"
        :favorite-ids="favoriteIds"
        @open-item="emit('open-item', $event)"
        @toggle-favorite="emit('toggle-favorite', $event)"
      />
      <CatalogTeacherQuickAccessSection
        section-id="catalog-favorites"
        title="收藏演示"
        :badge="favoriteItems.length ? `${favoriteItems.length}` : '未藏'"
        :items="favoriteItems"
        empty-title="收藏后会固定在这里"
        empty-copy=""
        fallback-hash="#catalog-favorites"
        :favorite-ids="favoriteIds"
        @open-item="emit('open-item', $event)"
        @toggle-favorite="emit('toggle-favorite', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.catalog-teacher-quick-access {
  display: grid;
  gap: 10px;
}

.catalog-workbench {
  min-width: 0;
  padding: 0;
}

.catalog-workbench-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.catalog-workbench-kicker {
  margin: 0;
}

.catalog-workbench-kicker {
  color: color-mix(in oklab, var(--accent-copper-strong) 78%, var(--text));
  font-size: calc(12px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.catalog-workbench-columns {
  display: grid;
  gap: 10px;
}

.catalog-workbench-column + .catalog-workbench-column {
  border-top: 1px solid color-mix(in oklab, var(--line-strong) 12%, var(--border));
  padding-top: 10px;
}

@media (min-width: 900px) {
  .catalog-workbench-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .catalog-workbench-column + .catalog-workbench-column {
    border-top: 0;
    border-inline-start: 1px solid color-mix(in oklab, var(--line-strong) 12%, var(--border));
    padding-top: 0;
    padding-inline-start: 14px;
  }
}

@media (max-width: 640px) {
  .catalog-workbench-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
