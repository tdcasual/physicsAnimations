<script setup lang="ts">
interface QuickCategory {
  id: string;
  title: string;
}

const props = defineProps<{
  quickCategories: QuickCategory[];
  hasLibraryHighlights: boolean;
}>();

const emit = defineEmits<{
  (event: "select-category", categoryId: string): void;
}>();
</script>

<template>
  <section class="catalog-quick-access" :class="'catalog-stage-band'">
    <div class="catalog-quick-access-band">
      <div class="catalog-quick-access-copy">
        <p class="catalog-quick-access-label">快捷入口</p>
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
        <a v-if="props.hasLibraryHighlights" href="#catalog-library" class="catalog-quick-chip catalog-quick-chip-link">资源库</a>
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
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 10px 18px;
  align-items: start;
}

.catalog-quick-access-copy {
  display: flex;
  align-items: center;
  min-width: 0;
}

.catalog-quick-access-label {
  margin: 0;
  color: color-mix(in oklab, var(--accent-copper-strong) 76%, var(--text));
  font-size: calc(11px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
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
  border: 1px solid color-mix(in oklab, var(--accent) 18%, var(--border));
  border-radius: 999px;
  min-height: 40px;
  padding: 7px 12px;
  background: color-mix(in oklab, var(--paper) 74%, var(--surface));
  color: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  font-size: calc(13px * var(--ui-scale, 1));
  font-weight: 600;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.catalog-quick-chip:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklab, var(--accent) 42%, var(--border));
  background: color-mix(in oklab, var(--accent) 8%, var(--surface));
}

.catalog-quick-chip:focus-visible {
  outline: none;
  border-color: color-mix(in oklab, var(--accent) 56%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 15%, transparent);
}

.catalog-quick-chip-link {
  border-color: color-mix(in oklab, var(--accent-copper) 42%, var(--border));
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
