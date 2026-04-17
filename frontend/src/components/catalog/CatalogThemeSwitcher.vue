<script setup lang="ts">
import { computed } from "vue";
import { useCatalogTheme } from "@/features/catalog/theme";
import { cn } from "@/lib/utils";

const { currentTheme, availableThemes, setTheme } = useCatalogTheme();

const currentThemeConfig = computed(() => {
  return (
    availableThemes.find((t) => t.id === currentTheme.value) ||
    availableThemes[0]
  );
});

function handleThemeChange(themeId: string) {
  setTheme(themeId);
}

const buttonClassesMap = computed(() => {
  const baseClasses =
    "relative flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200";
  const map: Record<string, string> = {};
  for (const theme of availableThemes) {
    const isActive = currentTheme.value === theme.id;
    switch (currentTheme.value) {
      case "handdrawn":
        map[theme.id] = cn(
          baseClasses,
          "border-2",
          isActive
            ? "tsw-btn-handdrawn-active translate-y-[-1px]"
            : "tsw-btn-handdrawn-idle"
        );
        break;
      case "brutalist":
        map[theme.id] = cn(
          baseClasses,
          "border-[3px] border-black",
          isActive
            ? "tsw-btn-brutalist-active shadow-[2px_2px_0_#666]"
            : "tsw-btn-brutalist-idle hover:shadow-[2px_2px_0_var(--cat-ink)] hover:translate-y-[-1px]"
        );
        break;
      default:
        map[theme.id] = cn(
          baseClasses,
          "border",
          isActive
            ? "tsw-btn-minimal-active"
            : "tsw-btn-minimal-idle"
        );
    }
  }
  return map;
});
</script>

<template>
  <div class="catalog-theme-switcher group">
    <!-- 触发按钮 -->
    <div class="tsw-trigger">
      <button
        v-for="theme in availableThemes"
        :key="theme.id"
        type="button"
        :class="buttonClassesMap[theme.id]"
        :title="`${theme.label} - ${theme.description}`"
        :aria-label="`${theme.label} - ${theme.description}`"
        :aria-pressed="currentTheme === theme.id"
        @click="handleThemeChange(theme.id)"
      >
        <span class="select-none">{{ theme.icon }}</span>

        <!-- 激活指示器 -->
        <span
          v-if="currentTheme === theme.id"
          class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          :class="{
            'tsw-dot-minimal': currentTheme === 'minimal',
            'tsw-dot-handdrawn': currentTheme === 'handdrawn',
            'bg-white': currentTheme === 'brutalist',
          }"
        />
      </button>
    </div>

    <!-- 当前主题提示（悬停显示） -->
    <div class="tsw-tooltip">
      {{ currentThemeConfig.label }}模式
    </div>
  </div>
</template>

<style scoped>
.catalog-theme-switcher {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.tsw-trigger {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(229, 231, 235, 0.5);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s ease;
}

.tsw-trigger:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
}

.tsw-btn-handdrawn-active {
  background: #ffffff;
  border-color: #1f2937;
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1);
}

.tsw-btn-handdrawn-idle {
  background: transparent;
  border-color: transparent;
}

.tsw-btn-handdrawn-idle:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.tsw-btn-brutalist-active {
  background: #000000;
  color: #ffffff;
}

.tsw-btn-brutalist-idle {
  background: #ffffff;
}

.tsw-btn-minimal-active {
  background: #111827;
  color: #ffffff;
  border-color: #111827;
}

.tsw-btn-minimal-idle {
  background: #ffffff;
  color: #4b5563;
  border-color: #e5e7eb;
}

.tsw-btn-minimal-idle:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}

.tsw-dot-minimal {
  background: #9ca3af;
}

.tsw-dot-handdrawn {
  background: #4b5563;
}

.tsw-tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  white-space: nowrap;
}

.group:hover .tsw-tooltip {
  opacity: 1;
}

/* 手绘风样式覆盖 */
[data-catalog-theme="handdrawn"] .catalog-theme-switcher > div {
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  border: 2px solid var(--cat-border-color);
  box-shadow: var(--cat-shadow-sm);
}

/* 新粗野主义样式覆盖 */
[data-catalog-theme="brutalist"] .catalog-theme-switcher > div {
  border-radius: 0;
  border: 3px solid var(--cat-ink);
  box-shadow: 3px 3px 0 var(--cat-ink);
}

[data-catalog-theme="brutalist"] .catalog-theme-switcher > div:hover {
  box-shadow: 4px 4px 0 var(--cat-ink);
}
</style>
