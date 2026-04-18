<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

import { isCatalogAppRoute, normalizePublicUrl } from "@/features/catalog/catalogLink";

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
    class="cat-card bg-card group relative flex flex-col overflow-hidden transition-[transform,box-shadow] duration-500"
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
        decoding="async"
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

<style scoped src="./catalog-cards.css"></style>

<style scoped>
.cat-external-badge {
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

[data-catalog-theme="handdrawn"] .cat-card-tag {
  border-bottom: 1px dashed var(--cat-border-color);
  padding-bottom: 1px;
}
</style>
