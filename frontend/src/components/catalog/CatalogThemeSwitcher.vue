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

function getButtonClasses(themeId: string) {
  const isActive = currentTheme.value === themeId;

  // 基础样式
  const baseClasses =
    "relative flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200";

  // 根据当前主题返回不同样式
  switch (currentTheme.value) {
    case "handdrawn":
      return cn(
        baseClasses,
        "border-2",
        isActive
          ? "bg-white border-gray-800 shadow-[2px_2px_0_rgba(0,0,0,0.1)] translate-y-[-1px]"
          : "bg-transparent border-transparent hover:border-gray-300 hover:bg-gray-50"
      );

    case "brutalist":
      return cn(
        baseClasses,
        "border-[3px] border-black",
        isActive
          ? "bg-black text-white shadow-[2px_2px_0_#666]"
          : "bg-white hover:shadow-[2px_2px_0_var(--cat-ink)] hover:translate-y-[-1px]"
      );

    default:
      // minimal
      return cn(
        baseClasses,
        "border",
        isActive
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
      );
  }
}
</script>

<template>
  <div class="catalog-theme-switcher group">
    <!-- 触发按钮 -->
    <div
      class="relative flex items-center gap-1 p-1 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow"
    >
      <button
        v-for="theme in availableThemes"
        :key="theme.id"
        type="button"
        :class="getButtonClasses(theme.id)"
        :title="`${theme.label} - ${theme.description}`"
        :aria-label="`${theme.label} - ${theme.description}`"
        @click="handleThemeChange(theme.id)"
      >
        <span class="select-none">{{ theme.icon }}</span>

        <!-- 激活指示器 -->
        <span
          v-if="currentTheme === theme.id"
          class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          :class="{
            'bg-gray-400': currentTheme === 'minimal',
            'bg-gray-600': currentTheme === 'handdrawn',
            'bg-white': currentTheme === 'brutalist',
          }"
        />
      </button>
    </div>

    <!-- 当前主题提示（悬停显示） -->
    <div
      class="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs text-gray-500 bg-white/90 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
    >
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
