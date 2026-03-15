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
  <section class="catalog-quick-access" data-tone="atlas">
    <div class="catalog-quick-access-band">
      <div class="catalog-quick-access-copy">
        <p class="catalog-quick-access-kicker">快捷入口</p>
        <h2 class="catalog-section-title catalog-quick-access-title">先从常用入口开始</h2>
        <p class="catalog-quick-access-note">把常用分类和资源入口压到一条快速开始带里，减少在大列表里的来回寻找。</p>
      </div>
      <div class="catalog-chip-list catalog-chip-list--quick">
        <button
          v-for="category in props.quickCategories"
          :key="`quick-${category.id}`"
          type="button"
          class="catalog-quick-chip"
          @click="emit('select-category', category.id)"
        >
          常用分类 · {{ category.title }}
        </button>
        <a v-if="props.hasLibraryHighlights" href="#catalog-library" class="catalog-quick-chip catalog-quick-chip-link">浏览资源库精选</a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.catalog-quick-access {
  position: relative;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--line-strong) 18%, var(--border));
  border-radius: 20px;
  box-shadow: 0 24px 52px -36px color-mix(in oklab, var(--ink) 26%, transparent);
  padding: clamp(14px, 1.7vw, 18px);
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--accent-copper) 7%, var(--surface)), color-mix(in oklab, var(--surface) 93%, var(--paper))),
    var(--surface);
}

.catalog-quick-access-band {
  display: grid;
  grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
  gap: 14px 18px;
  align-items: center;
}

.catalog-quick-access-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.catalog-quick-access-kicker,
.catalog-quick-access-note {
  margin: 0;
}

.catalog-quick-access-kicker {
  color: color-mix(in oklab, var(--accent-copper-strong) 76%, var(--text));
  font-size: calc(11px * var(--ui-scale, 1));
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.catalog-quick-access-title {
  font-size: clamp(1.15rem, 1rem + 0.35vw, 1.55rem);
  line-height: 1.12;
}

.catalog-quick-access-note {
  color: var(--muted);
  font-size: calc(13px * var(--ui-scale, 1));
  line-height: 1.45;
  max-width: 34ch;
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
  min-height: 44px;
  padding: 8px 12px;
  background: color-mix(in oklab, var(--surface) 86%, var(--paper));
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
  .catalog-quick-access {
    padding: 14px;
  }

  .catalog-quick-access-band {
    grid-template-columns: 1fr;
    gap: 12px;
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
