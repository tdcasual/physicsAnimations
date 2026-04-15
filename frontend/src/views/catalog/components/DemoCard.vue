<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { normalizePublicUrl, isCatalogAppRoute } from "@/features/catalog/catalogLink";

interface DemoCardProps {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  href: string;
  tag?: string;
  index?: number;
}

const props = defineProps<DemoCardProps>();

defineEmits<{
  (e: "tagClick", value: string): void;
}>();

const normalizedThumb = computed(() => {
  if (!props.thumbnail) return "";
  return normalizePublicUrl(props.thumbnail);
});

const isInternal = computed(() => isCatalogAppRoute(props.href));

// 为手绘风计算伪随机旋转角度（基于 id 保持一致）
const rotation = computed(() => {
  const hash = props.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 5) - 2.5; // -2.5 到 2.5 度
});
</script>

<template>
  <component
    :is="isInternal ? RouterLink : 'a'"
    :to="isInternal ? href : undefined"
    :href="isInternal ? undefined : href"
    class="cat-card bg-white group relative flex flex-col overflow-hidden transition-all duration-500"
    :style="{ '--card-rotation': rotation + 'deg' }"
  >
    <!-- Thumbnail Container - 3:2 ratio -->
    <div class="cat-card-image-wrapper relative aspect-[3/2] overflow-hidden">
      <!-- Image with subtle zoom -->
      <img
        v-if="normalizedThumb"
        :src="normalizedThumb"
        :alt="title"
        class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        loading="lazy"
      />
      <div
        v-else
        class="cat-card-placeholder flex h-full w-full items-center justify-center"
      >
        <span class="cat-placeholder-text font-serif">{{ title.slice(0, 1) }}</span>
      </div>

      <!-- Hover Overlay -->
      <div class="cat-card-overlay absolute inset-0 bg-white transition-all duration-500 group-hover:bg-black/5" />

      <!-- External Link Indicator -->
      <div
        v-if="!isInternal"
        class="cat-external-badge absolute right-3 top-3 text-xs font-light uppercase tracking-wider opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        外部链接
      </div>
    </div>

    <!-- Info Section -->
    <div class="cat-card-info pt-3">
      <h3 class="cat-card-title line-clamp-1">
        {{ title }}
      </h3>
      <div v-if="tag" class="mt-1">
        <span
          class="cat-card-tag transition-colors"
          @click.prevent="$emit('tagClick', tag!)"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </component>
</template>

<style scoped>
/* ===== 基础样式（极简主题） ===== */
.cat-card {
  background: var(--cat-bg-card, #ffffff);
}

.cat-card-image-wrapper {
  background: var(--cat-bg-secondary, #f8f8f8);
  border-radius: var(--cat-border-radius, 4px);
}

.cat-card-placeholder {
  background: var(--cat-bg-secondary, #f8f8f8);
}

.cat-placeholder-text {
  font-family: var(--cat-font-heading);
  font-size: 2.25rem;
  font-weight: 300;
  color: var(--cat-text-secondary, #666666);
  opacity: 0.5;
}

.cat-card-overlay {
  background: transparent;
}

.group:hover .cat-card-overlay {
  background: rgba(0, 0, 0, 0.03);
}

.cat-external-badge {
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.cat-card-info {
  color: var(--cat-text-primary, #1a1a1a);
}

.cat-card-title {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.25;
  color: var(--cat-text-primary);
}

.cat-card-tag {
  font-size: 0.625rem;
  font-weight: 300;
  color: var(--cat-text-secondary, #666666);
  cursor: pointer;
}

.cat-card-tag:hover {
  color: var(--cat-text-primary, #1a1a1a);
}

/* ===== 手绘风 (handdrawn) ===== */
[data-catalog-theme="handdrawn"] .cat-card {
  border: 2px solid var(--cat-border-color);
  border-radius: var(--cat-border-radius);
  box-shadow: var(--cat-shadow);
  background: var(--cat-bg-card);
  padding: var(--cat-spacing-sm);
  transform: rotate(var(--card-rotation, 0deg));
  transition: all var(--cat-transition-base);
}

[data-catalog-theme="handdrawn"] .cat-card:hover {
  transform: rotate(0deg) translateY(-4px);
  box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.12);
}

[data-catalog-theme="handdrawn"] .cat-card-image-wrapper {
  border: 1px solid var(--cat-border-color);
  border-radius: calc(var(--cat-border-radius) * 0.5);
  overflow: hidden;
}

[data-catalog-theme="handdrawn"] .cat-placeholder-text {
  font-family: 'Ma Shan Zheng', cursive;
  font-weight: 400;
}

[data-catalog-theme="handdrawn"] .cat-card-title {
  font-family: var(--cat-font-body);
  font-weight: 500;
}

[data-catalog-theme="handdrawn"] .cat-card-tag {
  border-bottom: 1px dashed var(--cat-border-color);
  padding-bottom: 1px;
}

/* ===== 新粗野主义 (brutalist) ===== */
[data-catalog-theme="brutalist"] .cat-card {
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #000;
  background: #fff;
  padding: 0;
}

[data-catalog-theme="brutalist"] .cat-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 #000;
}

[data-catalog-theme="brutalist"] .cat-card-image-wrapper {
  border-radius: 0;
  border-bottom: 3px solid #000;
}

[data-catalog-theme="brutalist"] .cat-placeholder-text {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
}

[data-catalog-theme="brutalist"] .cat-card-info {
  padding: 12px;
}

[data-catalog-theme="brutalist"] .cat-card-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

[data-catalog-theme="brutalist"] .cat-card-tag {
  color: #0000ff;
  font-weight: 500;
  text-transform: uppercase;
}
</style>
