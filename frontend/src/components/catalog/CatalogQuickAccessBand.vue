<script setup lang="ts">
  interface QuickCategory {
    id: string
    title: string
  }

  const props = defineProps<{
    quickCategories: QuickCategory[]
  }>()

  const emit = defineEmits<{
    (event: 'select-category', categoryId: string): void
  }>()
</script>

<template>
  <section class="catalog-quick-access" :class="'catalog-stage-band'">
    <div class="catalog-quick-access-band">
      <div class="catalog-quick-access-copy">
        <span class="catalog-quick-access-label">快捷入口</span>
      </div>
      <div class="catalog-chip-list catalog-chip-list--quick">
        <button
          v-for="category in props.quickCategories"
          :key="`quick-${category.id}`"
          type="button"
          class="catalog-quick-chip"
          @click="emit('select-category', category.id)"
        >
          {{ category.title }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
  .catalog-quick-access {
    min-width: 0;
    padding: 0;
  }

  .catalog-quick-access-band {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px 18px;
    align-items: center;
  }

  .catalog-quick-access-copy {
    display: flex;
    align-items: center;
    min-width: 0;
    min-height: 40px;
  }

  .catalog-quick-access-label {
    margin: 0;
    color: var(--accent-8);
    font-size: calc(13px * var(--ui-scale, 1));
    font-weight: 600;
  }

  .catalog-chip-list {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .catalog-chip-list--quick {
    align-items: center;
    justify-content: flex-start;
  }

  .catalog-quick-chip {
    border: 1px solid var(--border-default);
    border-radius: var(--radius-m);
    min-height: 40px;
    padding: 7px 12px;
    background: var(--surface-elevated);
    color: inherit;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    font-size: calc(13px * var(--ui-scale, 1));
    font-weight: 500;
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease,
      background-color 160ms ease;
  }

  .catalog-quick-chip:hover {
    transform: translateY(-1px);
    border-color: var(--accent-8);
    box-shadow: var(--shadow-sm);
  }

  .catalog-quick-chip:focus-visible {
    outline: none;
    border-color: var(--accent-8);
    box-shadow: 0 0 0 3px oklch(0% 0 0 / 0.08);
  }

  @media (max-width: 640px) {
    .catalog-quick-access-band {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .catalog-chip-list--quick {
      display: grid;
    }

    .catalog-quick-chip {
      width: 100%;
      justify-content: center;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .catalog-quick-chip {
      transition: none;
    }
  }
</style>
