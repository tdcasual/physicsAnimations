<script setup lang="ts">
import { computed } from "vue";
import { normalizePublicUrl } from "@/features/catalog/catalogLink";
import { FolderOpen } from "lucide-vue-next";

interface FolderCardProps {
  id: string;
  name: string;
  coverPath?: string;
  href: string;
  tag?: string;
  index?: number;
}

const props = defineProps<FolderCardProps>();

const normalizedCover = computed(() => {
  if (!props.coverPath) return "";
  return normalizePublicUrl(props.coverPath);
});

// 为手绘风计算伪随机旋转角度（基于 id 保持一致）
const rotation = computed(() => {
  const hash = props.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ((hash % 5) - 2.5) * -1; // 与 DemoCard 反向
});
</script>

<template>
  <a
    :href="href"
    class="cat-card group relative flex flex-col overflow-hidden transition-all duration-500"
    :style="{ '--card-rotation': rotation + 'deg' }"
  >
    <!-- Cover -->
    <div class="cat-card-image-wrapper relative aspect-[3/2] overflow-hidden">
      <img
        v-if="normalizedCover"
        :src="normalizedCover"
        :alt="name"
        class="h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />
      <div
        v-else
        class="cat-card-placeholder flex h-full w-full items-center justify-center"
      >
        <FolderOpen class="cat-folder-icon h-8 w-8" />
      </div>

      <!-- Hover overlay -->
      <div class="cat-card-overlay absolute inset-0 transition-all duration-500" />
      
      <!-- 文件夹标签 -->
      <div class="cat-folder-badge absolute left-3 top-3 text-xs font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {{ tag }}
      </div>
    </div>

    <!-- Info -->
    <div class="cat-card-info pt-3">
      <h3 class="cat-card-title line-clamp-1">
        {{ name || id }}
      </h3>
      <div v-if="tag" class="mt-1 md:hidden">
        <span class="cat-card-tag">
          {{ tag }}
        </span>
      </div>
    </div>
  </a>
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

.cat-folder-icon {
  color: var(--cat-text-secondary, #666666);
  opacity: 0.5;
}

.cat-card-overlay {
  background: transparent;
}

.group:hover .cat-card-overlay {
  background: rgba(0, 0, 0, 0.03);
}

.cat-folder-badge {
  color: rgba(255, 255, 255, 0.95);
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 10px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

[data-catalog-theme="handdrawn"] .cat-folder-badge {
  background: var(--cat-bg-card);
  color: var(--cat-text-primary);
  border: 1px solid var(--cat-border-color);
  box-shadow: var(--cat-shadow-sm);
  font-family: var(--cat-font-body);
  text-transform: none;
  letter-spacing: 0;
}

[data-catalog-theme="handdrawn"] .cat-card-title {
  font-family: var(--cat-font-body);
  font-weight: 500;
}

/* ===== 新粗野主义 (brutalist) ===== */
[data-catalog-theme="brutalist"] .cat-card {
  border: 3px solid var(--cat-ink);
  box-shadow: 4px 4px 0 var(--cat-ink);
  background: var(--cat-paper);
  padding: 0;
}

[data-catalog-theme="brutalist"] .cat-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--cat-ink);
}

[data-catalog-theme="brutalist"] .cat-card-image-wrapper {
  border-radius: 0;
  border-bottom: 3px solid var(--cat-ink);
}

[data-catalog-theme="brutalist"] .cat-folder-badge {
  background: var(--cat-ink);
  color: var(--cat-paper);
  border-radius: 0;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
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
  color: var(--cat-text-accent);
  font-weight: 500;
}
</style>
