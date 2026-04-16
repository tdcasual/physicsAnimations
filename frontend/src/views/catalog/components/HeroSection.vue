<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next";
import { computed, onMounted, onUnmounted } from "vue";
import type { GSAPType } from "../../../lib/gsap";

const props = withDefaults(defineProps<{
  itemCount?: number;
  categoryCount?: number;
}>(), {
  itemCount: 0,
  categoryCount: 0,
});

const stats = computed(() => {
  const itemCount = Math.max(0, Number(props.itemCount || 0));
  const categoryCount = Math.max(0, Number(props.categoryCount || 0));

  return [
    {
      value: itemCount > 0 ? String(itemCount) : "持续",
      label: itemCount > 0 ? "演示" : "更新",
    },
    {
      value: categoryCount > 1 ? String(categoryCount) : "精选",
      label: categoryCount > 1 ? "分类" : "内容",
    },
    {
      value: "在线",
      label: "访问",
    },
  ];
});

let tweens: GSAPType.core.Tween[] = [];

onMounted(async () => {
  const { initGsap } = await import("../../../lib/gsap");
  const { gsap } = await initGsap();

  tweens.push(
    gsap.fromTo(
      ".hero-title",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }
    )
  );

  tweens.push(
    gsap.fromTo(
      ".hero-subtitle",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, delay: 0.2, ease: "power2.out" }
    )
  );

  tweens.push(
    gsap.fromTo(
      ".hero-stats",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, delay: 0.4, stagger: 0.1, ease: "power2.out" }
    )
  );

  tweens.push(
    gsap.fromTo(
      ".hand-drawn-decoration",
      { scale: 0, rotation: -20 },
      { scale: 1, rotation: 0, duration: 0.6, delay: 0.6, ease: "back.out(1.7)", stagger: 0.1 }
    )
  );
});

onUnmounted(() => {
  tweens.forEach((t) => t.kill());
  tweens = [];
});
</script>

<template>
  <section class="hero-section relative flex min-h-[400px] flex-col items-center justify-center py-16 text-center md:py-20">
    <div class="hand-drawn-decoration absolute left-[15%] top-[20%] hidden text-2xl opacity-60 md:block">✦</div>
    <div class="hand-drawn-decoration absolute right-[20%] top-[25%] hidden text-xl opacity-40 md:block">✧</div>
    <div class="hand-drawn-decoration absolute bottom-[30%] left-[10%] hidden text-lg opacity-50 md:block">◦</div>
    <div class="hand-drawn-decoration absolute bottom-[25%] right-[15%] hidden text-2xl opacity-40 md:block">✦</div>

    <svg class="hand-drawn-decoration absolute left-1/2 top-12 hidden h-16 w-px md:block" viewBox="0 0 2 64">
      <path d="M1 0 Q1.5 16 1 32 Q0.5 48 1 64" stroke="currentColor" stroke-width="1" fill="none" class="text-muted-foreground/30" />
    </svg>

    <div class="relative mx-auto w-full max-w-4xl px-6">
      <h1 class="hero-title cat-title font-serif text-5xl font-light tracking-wide md:text-6xl lg:text-7xl">
        演示工坊
      </h1>

      <p class="hero-subtitle mx-auto mt-8 max-w-lg text-base font-light leading-relaxed opacity-70">
        持续整理互动演示，方便课堂展示、快速打开与即时预览
      </p>

      <div class="mt-12 flex justify-center gap-8 md:gap-12">
        <div
          v-for="stat in stats"
          :key="`${stat.value}-${stat.label}`"
          class="hero-stats cat-stat-item text-center"
        >
          <div class="cat-stat-number text-3xl font-light">{{ stat.value }}</div>
          <div class="cat-stat-label mt-1 text-xs font-light uppercase tracking-widest">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <div class="absolute bottom-6 left-1/2 -translate-x-1/2">
      <ChevronDown class="h-4 w-4 animate-bounce opacity-30" />
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  background: var(--cat-bg-primary, #ffffff);
  color: var(--cat-text-primary, #1a1a1a);
}

.cat-title {
  font-family: var(--cat-font-heading);
  color: var(--cat-text-primary);
}

.hero-subtitle {
  color: var(--cat-text-secondary);
}

.cat-stat-item {
  padding: var(--cat-spacing-md, 16px) var(--cat-spacing-lg, 24px);
  border-radius: var(--cat-border-radius, 4px);
  transition: all var(--cat-transition-base, 300ms);
}

.cat-stat-number {
  color: var(--cat-text-primary);
}

.cat-stat-label {
  color: var(--cat-text-secondary);
}

[data-catalog-theme="handdrawn"] .hero-section {
  position: relative;
}

[data-catalog-theme="handdrawn"] .cat-title {
  font-family: "Ma Shan Zheng", "Zeyada", cursive;
  font-weight: 400;
  letter-spacing: 0.05em;
  transform: rotate(-1deg);
}

[data-catalog-theme="handdrawn"] .hero-subtitle {
  font-family: var(--cat-font-body);
  transform: rotate(0.5deg);
}

[data-catalog-theme="handdrawn"] .cat-stat-item {
  border: 2px solid var(--cat-border-color);
  border-radius: var(--cat-border-radius);
  box-shadow: var(--cat-shadow-sm);
  background: var(--cat-bg-card);
  transform: rotate(var(--rotation, 0deg));
}

[data-catalog-theme="handdrawn"] .cat-stat-item:nth-child(1) {
  --rotation: -1deg;
}

[data-catalog-theme="handdrawn"] .cat-stat-item:nth-child(2) {
  --rotation: 0.5deg;
}

[data-catalog-theme="handdrawn"] .cat-stat-item:nth-child(3) {
  --rotation: -0.5deg;
}

[data-catalog-theme="handdrawn"] .cat-stat-item:hover {
  transform: rotate(0deg) translateY(-2px);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
}

[data-catalog-theme="handdrawn"] .cat-stat-number {
  font-family: "Zeyada", cursive;
  font-weight: 600;
}

[data-catalog-theme="handdrawn"] .hand-drawn-decoration {
  color: var(--cat-border-color);
  font-family: "Zeyada", cursive;
}

[data-catalog-theme="brutalist"] .cat-title {
  font-family: "Space Grotesk", sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.02em;
}

[data-catalog-theme="brutalist"] .cat-stat-item {
  border: 3px solid var(--cat-ink);
  box-shadow: 3px 3px 0 var(--cat-ink);
  background: var(--cat-paper);
}

[data-catalog-theme="brutalist"] .cat-stat-item:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 var(--cat-ink);
}

[data-catalog-theme="brutalist"] .hand-drawn-decoration {
  display: none;
}
</style>
