<script setup lang="ts">
import type { CatalogItem } from "../../features/catalog/types";
import CatalogTeacherQuickAccessSection from "./CatalogTeacherQuickAccessSection.vue";

defineProps<{
  recentItems: CatalogItem[];
  favoriteItems: CatalogItem[];
  favoriteIds: Set<string>;
}>();

const emit = defineEmits<{
  (event: "open-item", hash: string): void;
  (event: "toggle-favorite", itemId: string): void;
}>();
</script>

<template>
  <section class="catalog-teacher-quick-access catalog-workbench catalog-stage-rail" aria-label="教学快捷入口">
    <div class="catalog-workbench-head">
      <h2 class="catalog-workbench-title">教学工作区</h2>
    </div>
    <div class="catalog-workbench-columns">
      <CatalogTeacherQuickAccessSection
        section-id="catalog-recent"
        title="最近查看"
        :badge="recentItems.length ? `${recentItems.length}` : '0'"
        :items="recentItems"
        empty-title="暂无记录"
        empty-hint="浏览演示后将自动记录"
        fallback-hash="#catalog-recent"
        :favorite-ids="favoriteIds"
        @open-item="emit('open-item', $event)"
        @toggle-favorite="emit('toggle-favorite', $event)"
      />
      <CatalogTeacherQuickAccessSection
        section-id="catalog-favorites"
        title="收藏演示"
        :badge="favoriteItems.length ? `${favoriteItems.length}` : '0'"
        :items="favoriteItems"
        empty-title="暂无收藏"
        empty-hint="点击收藏按钮添加"
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
  border: 1px solid var(--border);
  border-radius: var(--radius-l);
  padding: 16px;
  background: var(--surface-raised);
}

.catalog-workbench {
  min-width: 0;
}

.catalog-workbench-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.catalog-workbench-title {
  margin: 0;
  color: var(--accent);
  font-size: clamp(1.15rem, 1rem + 0.3vw, 1.35rem);
  font-weight: 700;
  padding-left: 10px;
  border-left: 3px solid var(--accent);
}

.catalog-workbench-columns {
  display: grid;
  gap: 10px;
}

.catalog-workbench-column + .catalog-workbench-column {
  border-top: 1px solid var(--border);
  padding-top: 10px;
}

@media (min-width: 900px) {
  .catalog-workbench-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .catalog-workbench-column + .catalog-workbench-column {
    border-top: 0;
    border-inline-start: 1px solid var(--border);
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
