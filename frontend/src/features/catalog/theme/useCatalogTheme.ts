import { onMounted, ref } from "vue";

import { presetThemes } from "./presets";
import {
  getStoredCatalogTheme,
  isValidCatalogTheme,
  setStoredCatalogTheme,
} from "./types";

const currentTheme = ref<string>("minimal");
const isInitialized = ref(false);

/**
 * 获取所有可用主题（用于切换按钮）
 */
export function getAvailableThemes() {
  return presetThemes;
}

/**
 * Catalog 首页主题管理
 * 独立于全局 dark/light 主题系统
 */
export function useCatalogTheme() {
  /**
   * 设置主题
   */
  const setTheme = (theme: string) => {
    currentTheme.value = theme;
    setStoredCatalogTheme(theme);

    // 应用到 DOM
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-catalog-theme", theme);
    }
  };

  /**
   * 初始化主题（从 localStorage 读取）
   */
  const initTheme = () => {
    if (isInitialized.value) return;

    const saved = getStoredCatalogTheme();
    if (saved && isValidCatalogTheme(saved)) {
      currentTheme.value = saved;
    }

    // 应用到 DOM
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "data-catalog-theme",
        currentTheme.value
      );
    }

    isInitialized.value = true;
  };

  /**
   * 切换到下一个主题（循环）
   */
  const cycleTheme = () => {
    const themes = presetThemes.map((t) => t.id);
    const currentIndex = themes.indexOf(currentTheme.value);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // 组件挂载时自动初始化
  onMounted(() => {
    initTheme();
  });

  return {
    currentTheme,
    availableThemes: presetThemes,
    setTheme,
    initTheme,
    cycleTheme,
    isInitialized,
  };
}

/**
 * 在应用启动时初始化主题（防止闪烁）
 * 应在 main.ts 中尽早调用
 */
export function initCatalogThemeEarly(): void {
  if (typeof document === "undefined") return;

  const saved = getStoredCatalogTheme();
  if (saved && isValidCatalogTheme(saved)) {
    document.documentElement.setAttribute("data-catalog-theme", saved);
  }
}
