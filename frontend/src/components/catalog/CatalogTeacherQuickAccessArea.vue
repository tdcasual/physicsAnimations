<script setup lang="ts">
  import { computed, ref } from 'vue'
  import type { CatalogItem } from '../../features/catalog/types'
  import CatalogTeacherQuickAccessSection from './CatalogTeacherQuickAccessSection.vue'

  const props = defineProps<{
    recentItems: CatalogItem[]
    favoriteItems: CatalogItem[]
    favoriteIds: Set<string>
  }>()

  const emit = defineEmits<{
    (event: 'open-item', hash: string): void
    (event: 'toggle-favorite', itemId: string): void
  }>()

  const mobileWorkbenchOpen = ref(false)

  const workbenchSummary = computed(() => {
    const recentCount = props.recentItems.length
    const favoriteCount = props.favoriteItems.length
    return {
      recentCount,
      favoriteCount,
      totalCount: recentCount + favoriteCount,
    }
  })

  const workbenchToggleLabel = computed(() =>
    mobileWorkbenchOpen.value ? '收起教学工作区' : '展开教学工作区'
  )
</script>

<template>
  <section
    class="catalog-teacher-quick-access catalog-workbench catalog-stage-rail"
    aria-label="教学快捷入口"
  >
    <div class="catalog-workbench-head">
      <h2 class="catalog-workbench-title">教学工作区</h2>
      <button
        type="button"
        class="catalog-workbench-summary"
        :aria-expanded="mobileWorkbenchOpen ? 'true' : 'false'"
        @click="mobileWorkbenchOpen = !mobileWorkbenchOpen"
      >
        <span class="catalog-workbench-summary-copy">
          <strong>{{
            workbenchSummary.totalCount
              ? `${workbenchSummary.totalCount} 条教学线索`
              : '先开始浏览演示'
          }}</strong>
          <span
            >最近 {{ workbenchSummary.recentCount }} · 收藏
            {{ workbenchSummary.favoriteCount }}</span
          >
        </span>
        <span class="catalog-workbench-summary-toggle">{{ workbenchToggleLabel }}</span>
      </button>
    </div>
    <div class="catalog-workbench-disclosure" :class="{ 'is-open': mobileWorkbenchOpen }">
      <div class="catalog-workbench-disclosure-inner">
        <div class="catalog-workbench-columns">
          <CatalogTeacherQuickAccessSection
            section-id="catalog-recent"
            title="最近查看"
            :badge="props.recentItems.length ? `${props.recentItems.length}` : '0'"
            :items="props.recentItems"
            empty-title="暂无记录"
            empty-hint="浏览演示后将自动记录"
            fallback-hash="#catalog-recent"
            :favorite-ids="props.favoriteIds"
            @open-item="emit('open-item', $event)"
            @toggle-favorite="emit('toggle-favorite', $event)"
          />
          <CatalogTeacherQuickAccessSection
            section-id="catalog-favorites"
            title="收藏演示"
            :badge="props.favoriteItems.length ? `${props.favoriteItems.length}` : '0'"
            :items="props.favoriteItems"
            empty-title="暂无收藏"
            empty-hint="点击收藏按钮添加"
            fallback-hash="#catalog-favorites"
            :favorite-ids="props.favoriteIds"
            @open-item="emit('open-item', $event)"
            @toggle-favorite="emit('toggle-favorite', $event)"
          />
        </div>
      </div>
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

  .catalog-workbench-summary {
    display: none;
    width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    padding: 10px 12px;
    background: color-mix(in oklab, var(--surface-raised) 88%, var(--paper) 12%);
    color: inherit;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
  }

  .catalog-workbench-summary-copy {
    display: grid;
    gap: 2px;
  }

  .catalog-workbench-summary-copy strong {
    font-size: calc(13px * var(--ui-scale, 1));
    line-height: 1.2;
  }

  .catalog-workbench-summary-copy span,
  .catalog-workbench-summary-toggle {
    color: var(--muted);
    font-size: calc(12px * var(--ui-scale, 1));
    line-height: 1.35;
  }

  .catalog-workbench-summary-toggle {
    justify-self: end;
    color: var(--accent);
    font-weight: 600;
  }

  .catalog-workbench-disclosure {
    display: grid;
    grid-template-rows: 1fr;
  }

  .catalog-workbench-disclosure-inner {
    min-height: 0;
  }

  .catalog-workbench-column + .catalog-workbench-column {
    border-top: 1px solid var(--border);
    padding-top: 10px;
  }

  @media (min-width: 960px) {
    .catalog-teacher-quick-access {
      gap: 8px;
      padding: 14px;
    }

    .catalog-workbench-head {
      align-items: center;
      gap: 8px;
    }

    .catalog-workbench-title {
      font-size: clamp(1.05rem, 0.96rem + 0.18vw, 1.18rem);
      padding-left: 8px;
    }

    .catalog-workbench-columns {
      gap: 8px;
    }

    .catalog-workbench-column + .catalog-workbench-column {
      padding-top: 8px;
    }

    .catalog-workbench-columns :deep(.catalog-workbench-column) {
      gap: 8px;
    }

    .catalog-workbench-columns :deep(.catalog-workbench-column-title) {
      font-size: calc(15px * var(--ui-scale, 1));
    }

    .catalog-workbench-columns :deep(.catalog-teacher-row) {
      gap: 6px;
      padding: 6px 0;
    }

    .catalog-workbench-columns :deep(.catalog-teacher-link) {
      grid-template-columns: 56px minmax(0, 1fr);
      gap: 8px;
    }

    .catalog-workbench-columns :deep(.catalog-teacher-action) {
      min-height: 30px;
      padding: 4px 8px;
    }

    .catalog-workbench-columns :deep(.catalog-teacher-empty) {
      min-height: 48px;
      padding-top: 8px;
      align-content: start;
      justify-items: start;
      text-align: left;
    }
  }

  @media (max-width: 640px) {
    .catalog-workbench-head {
      align-items: stretch;
      flex-direction: column;
      gap: 4px;
    }

    .catalog-workbench-summary {
      display: grid;
      gap: 6px;
    }

    .catalog-workbench-disclosure {
      grid-template-rows: 0fr;
      overflow: hidden;
      transition: grid-template-rows 180ms ease;
    }

    .catalog-workbench-disclosure.is-open {
      grid-template-rows: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .catalog-workbench-disclosure {
      transition: none;
    }
  }
</style>
