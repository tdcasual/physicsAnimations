<script setup lang="ts">
import { Atom, ChevronDown, Eye, LayoutGrid, Search } from "lucide-vue-next";
import { computed } from "vue";

import { useCatalogSearch } from "../../../features/catalog/catalogSearch";
import type { CatalogCategory } from "../../../features/catalog/types";

import { useHeroAnimations } from "./useHeroAnimations";

const props = withDefaults(defineProps<{
  itemCount?: number;
  categoryCount?: number;
  categories?: CatalogCategory[];
}>(), {
  itemCount: 0,
  categoryCount: 0,
  categories: () => [],
});

const emit = defineEmits<{
  (event: "select-category", categoryId: string): void;
}>();

const query = useCatalogSearch();

const stats = computed(() => {
  const itemCount = Math.max(0, Number(props.itemCount || 0));
  const categoryCount = Math.max(0, Number(props.categoryCount || 0));

  return [
    {
      value: itemCount > 0 ? String(itemCount) : "持续",
      label: itemCount > 0 ? "演示" : "更新",
      icon: Atom,
    },
    {
      value: categoryCount > 1 ? String(categoryCount) : "精选",
      label: categoryCount > 1 ? "分类" : "内容",
      icon: LayoutGrid,
    },
    {
      value: "在线",
      label: "访问",
      icon: Eye,
    },
  ];
});

const hotCategories = computed(() => {
  return (props.categories || [])
    .filter((c) => !c.hidden)
    .slice(0, 5);
});

useHeroAnimations();

function onTagClick(categoryId: string) {
  emit("select-category", categoryId);
}
</script>

<template>
  <section class="hero-section relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden py-16 text-center md:min-h-[480px] md:py-20">
    <!-- Background physics illustration -->
    <div class="hero-bg-graphic pointer-events-none absolute inset-0 flex items-center justify-center opacity-0">
      <svg class="hero-bg-svg" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Pendulum -->
        <line x1="400" y1="40" x2="400" y2="200" stroke="currentColor" stroke-width="1.5" opacity="0.4" />
        <circle cx="400" cy="220" r="18" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.5" />
        <!-- Sine wave -->
        <path d="M120 280 Q 180 220, 240 280 T 360 280 T 480 280 T 600 280 T 720 280" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.35" />
        <!-- Dotted axis -->
        <line x1="100" y1="280" x2="740" y2="280" stroke="currentColor" stroke-width="1" stroke-dasharray="4 6" opacity="0.25" />
        <!-- Circular orbit -->
        <ellipse cx="650" cy="150" rx="60" ry="60" stroke="currentColor" stroke-width="1" fill="none" opacity="0.25" />
        <circle cx="650" cy="90" r="6" fill="currentColor" opacity="0.3" />
        <!-- Velocity vector -->
        <polygon points="580,140 595,135 595,145" fill="currentColor" opacity="0.2" />
        <line x1="580" y1="140" x2="560" y2="140" stroke="currentColor" stroke-width="1.5" opacity="0.25" />
      </svg>
    </div>

    <!-- Decorative particles -->
    <div class="hand-drawn-decoration absolute left-[15%] top-[20%] hidden text-2xl opacity-60 md:block">✦</div>
    <div class="hand-drawn-decoration absolute right-[20%] top-[25%] hidden text-xl opacity-40 md:block">✧</div>
    <div class="hand-drawn-decoration absolute bottom-[30%] left-[10%] hidden text-lg opacity-50 md:block">◦</div>
    <div class="hand-drawn-decoration absolute bottom-[25%] right-[15%] hidden text-2xl opacity-40 md:block">✦</div>

    <svg class="hand-drawn-decoration absolute left-1/2 top-12 hidden h-16 w-px md:block" viewBox="0 0 2 64">
      <path d="M1 0 Q1.5 16 1 32 Q0.5 48 1 64" stroke="currentColor" stroke-width="1" fill="none" class="text-muted-foreground/30" />
    </svg>

    <div class="relative z-10 mx-auto w-full max-w-4xl px-6">
      <h1 class="hero-title cat-title font-serif text-5xl font-normal tracking-wide md:text-6xl lg:text-7xl">
        演示工坊
      </h1>

      <p class="hero-subtitle mx-auto mt-6 max-w-xl text-base font-light leading-relaxed opacity-80 md:mt-8">
        持续整理互动演示，方便课堂展示、快速打开与即时预览
      </p>

      <!-- Search bar -->
      <div class="hero-search mx-auto mt-8 flex w-full max-w-md items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2.5 shadow-sm backdrop-blur-sm transition-all focus-within:border-primary focus-within:shadow md:mt-10">
        <Search class="h-4 w-4 shrink-0 opacity-50" />
        <input
          v-model="query"
          type="search"
          placeholder="搜索演示、实验或知识点..."
          class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>

      <!-- Stats -->
      <div class="mt-10 flex justify-center gap-6 md:mt-12 md:gap-10">
        <div
          v-for="stat in stats"
          :key="`${stat.value}-${stat.label}`"
          class="hero-stats cat-stat-item flex flex-col items-center text-center"
        >
          <div class="hero-stat-icon mb-2 flex h-9 w-9 items-center justify-center rounded-full md:h-10 md:w-10">
            <component :is="stat.icon" class="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <div class="cat-stat-number text-2xl font-normal md:text-3xl">{{ stat.value }}</div>
          <div class="cat-stat-label mt-1 text-xs font-light uppercase tracking-widest">{{ stat.label }}</div>
        </div>
      </div>

      <!-- Hot category tags -->
      <div v-if="hotCategories.length > 0" class="hero-tags mt-8 flex flex-wrap items-center justify-center gap-2 md:mt-10">
        <span class="text-xs opacity-60">热门：</span>
        <button
          v-for="cat in hotCategories"
          :key="cat.id"
          type="button"
          class="hero-tag cat-btn text-xs"
          @click="onTagClick(cat.id)"
        >
          {{ cat.title }}
        </button>
      </div>
    </div>

    <div class="absolute bottom-5 left-1/2 z-10 -translate-x-1/2">
      <ChevronDown class="h-4 w-4 animate-bounce opacity-30" />
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  background: var(--cat-bg-primary, #ffffff);
  color: var(--cat-text-primary, #1a1a1a);
}

.hero-bg-graphic {
  color: var(--cat-text-primary);
}

.hero-bg-svg {
  width: min(900px, 140%);
  height: auto;
  opacity: 0.08;
  transform: translateY(10%);
}

.cat-title {
  font-family: var(--cat-font-heading);
  color: var(--cat-text-primary);
}

.hero-subtitle {
  color: var(--cat-text-secondary);
}

.hero-search {
  background: color-mix(in oklab, var(--cat-bg-card, #ffffff) 92%, transparent);
  border-color: var(--cat-border-color);
}

.hero-search:focus-within {
  border-color: var(--cat-text-accent);
}

.cat-stat-item {
  padding: var(--cat-spacing-md, 16px) var(--cat-spacing-lg, 24px);
  border-radius: var(--cat-border-radius, 4px);
  transition: all var(--cat-transition-base, 300ms);
}

.hero-stat-icon {
  background: color-mix(in oklab, var(--cat-text-primary) 8%, transparent);
  color: var(--cat-text-primary);
}

.cat-stat-number {
  color: var(--cat-text-primary);
}

.cat-stat-label {
  color: var(--cat-text-secondary);
}

.hero-tag {
  padding: 6px 14px;
  border-radius: 9999px;
  border: 1px solid var(--cat-border-color);
  background: color-mix(in oklab, var(--cat-bg-card, #ffffff) 80%, transparent);
  color: var(--cat-text-secondary);
  transition: all var(--cat-transition-fast, 150ms);
}

.hero-tag:hover {
  border-color: var(--cat-text-accent);
  color: var(--cat-text-primary);
  background: var(--cat-bg-card, #ffffff);
}

/* Reduced motion & forced colors safety net */
@media (prefers-reduced-motion: reduce) {
  .hero-title,
  .hero-subtitle,
  .hero-search,
  .hero-stats,
  .hero-tags,
  .hand-drawn-decoration,
  .hero-bg-graphic {
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>
