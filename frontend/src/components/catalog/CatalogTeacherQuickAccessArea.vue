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
  <section class="catalog-teacher-quick-access" aria-label="教学快捷入口">
    <CatalogTeacherWorkspaceSummary v-if="workspaceSummary?.length" :summary="workspaceSummary" />
    <CatalogTeacherQuickAccessSection
      section-id="catalog-recent"
      title="最近查看"
      copy="最近打开过的演示会保留在这里，方便课前回放和课中重开。"
      :badge="recentItems.length ? `${recentItems.length} 个最近入口` : '等待首次打开'"
      :items="recentItems"
      empty-title="最近查看会出现在这里"
      empty-copy="先打开一个演示，课前回放和课中重开会从这里开始。"
      fallback-hash="#catalog-recent"
      :favorite-ids="favoriteIds"
      @open-item="emit('open-item', $event)"
      @toggle-favorite="emit('toggle-favorite', $event)"
    />
    <CatalogTeacherQuickAccessSection
      section-id="catalog-favorites"
      title="收藏演示"
      copy="把常用演示钉在这里，下次备课时不用重复搜索。"
      :badge="favoriteItems.length ? `${favoriteItems.length} 个收藏入口` : '尚未收藏'"
      :items="favoriteItems"
      empty-title="把常用演示钉在这里"
      empty-copy="把高频演示钉在这里，下一节课不用重新搜索。"
      fallback-hash="#catalog-favorites"
      :favorite-ids="favoriteIds"
      @open-item="emit('open-item', $event)"
      @toggle-favorite="emit('toggle-favorite', $event)"
    />
  </section>
</template>
