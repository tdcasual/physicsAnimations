<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next";
import { onMounted } from "vue";

onMounted(async () => {
  const { initGsap } = await import("../../../lib/gsap");
  const { gsap } = await initGsap();

  // Subtle fade-in animation
  gsap.fromTo(
    ".hero-title",
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }
  );

  gsap.fromTo(
    ".hero-subtitle",
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6, delay: 0.2, ease: "power2.out" }
  );

  gsap.fromTo(
    ".hero-stats",
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6, delay: 0.4, stagger: 0.1, ease: "power2.out" }
  );

  // 手绘风装饰元素动画
  gsap.fromTo(
    ".hand-drawn-decoration",
    { scale: 0, rotation: -20 },
    { scale: 1, rotation: 0, duration: 0.6, delay: 0.6, ease: "back.out(1.7)", stagger: 0.1 }
  );
});
</script>

<template>
  <section class="hero-section relative flex min-h-[400px] flex-col items-center justify-center py-16 md:py-20 text-center">
    <!-- 装饰元素 - 手绘风星星和线条 -->
    <div class="hand-drawn-decoration absolute left-[15%] top-[20%] text-2xl opacity-60 hidden md:block">✦</div>
    <div class="hand-drawn-decoration absolute right-[20%] top-[25%] text-xl opacity-40 hidden md:block">✧</div>
    <div class="hand-drawn-decoration absolute left-[10%] bottom-[30%] text-lg opacity-50 hidden md:block">◦</div>
    <div class="hand-drawn-decoration absolute right-[15%] bottom-[25%] text-2xl opacity-40 hidden md:block">✦</div>
    
    <!-- 手绘风装饰线条 -->
    <svg class="hand-drawn-decoration absolute left-1/2 top-12 h-16 w-px hidden md:block" viewBox="0 0 2 64">
      <path d="M1 0 Q1.5 16 1 32 Q0.5 48 1 64" stroke="currentColor" stroke-width="1" fill="none" class="text-gray-300"/>
    </svg>

    <div class="relative mx-auto w-full max-w-4xl px-6">
      <!-- Main Title - 使用 CSS 变量适配不同主题 -->
      <h1 class="hero-title cat-title font-serif text-5xl font-light tracking-wide md:text-6xl lg:text-7xl">
        演示工坊
      </h1>

      <!-- Subtitle -->
      <p class="hero-subtitle mx-auto mt-8 max-w-lg text-base font-light leading-relaxed opacity-70">
        精选多学科互动演示，让抽象知识变得直观可感
      </p>

      <!-- Stats - 手绘风卡片样式 -->
      <div class="mt-12 flex justify-center gap-8 md:gap-12">
        <div class="hero-stats cat-stat-item text-center">
          <div class="cat-stat-number text-3xl font-light">100+</div>
          <div class="cat-stat-label mt-1 text-xs font-light uppercase tracking-widest opacity-60">演示</div>
        </div>
        <div class="hero-stats cat-stat-item text-center">
          <div class="cat-stat-number text-3xl font-light">6</div>
          <div class="cat-stat-label mt-1 text-xs font-light uppercase tracking-widest opacity-60">学科</div>
        </div>
        <div class="hero-stats cat-stat-item text-center">
          <div class="cat-stat-number text-3xl font-light">免费</div>
          <div class="cat-stat-label mt-1 text-xs font-light uppercase tracking-widest opacity-60">访问</div>
        </div>
      </div>
    </div>

    <!-- Scroll indicator -->
    <div class="absolute bottom-6 left-1/2 -translate-x-1/2">
      <ChevronDown class="h-4 w-4 animate-bounce opacity-30" />
    </div>
  </section>
</template>

<style scoped>
/* 基础样式 */
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

/* Stats 样式 */
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

/* ===== 手绘风特殊样式 ===== */
[data-catalog-theme="handdrawn"] .hero-section {
  position: relative;
}

[data-catalog-theme="handdrawn"] .cat-title {
  font-family: 'Ma Shan Zheng', 'Zeyada', cursive;
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
  font-family: 'Zeyada', cursive;
  font-weight: 600;
}

[data-catalog-theme="handdrawn"] .hand-drawn-decoration {
  color: var(--cat-border-color);
  font-family: 'Zeyada', cursive;
}

/* ===== 新粗野主义特殊样式 ===== */
[data-catalog-theme="brutalist"] .cat-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.02em;
}

[data-catalog-theme="brutalist"] .cat-stat-item {
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  background: #fff;
}

[data-catalog-theme="brutalist"] .cat-stat-item:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 #000;
}

[data-catalog-theme="brutalist"] .hand-drawn-decoration {
  display: none;
}
</style>
