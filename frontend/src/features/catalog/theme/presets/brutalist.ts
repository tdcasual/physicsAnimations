/**
 * 新粗野主义主题
 */
import type { CatalogThemeConfig } from "../types";

export const brutalistTheme: CatalogThemeConfig = {
  id: "brutalist",
  label: "粗野",
  icon: "▣",
  description: "新粗野主义，大胆张扬",
};

// CSS 变量定义
export const brutalistVars = {
  // 边框 - 直角、粗线条
  "--cat-border-radius": "0",
  "--cat-border-radius-lg": "0",
  "--cat-border-width": "3px",
  "--cat-border-color": "#000000",
  "--cat-border-color-strong": "#000000",

  // 阴影 - 硬阴影、高对比
  "--cat-shadow-sm": "2px 2px 0 #000",
  "--cat-shadow": "4px 4px 0 #000",
  "--cat-shadow-lg": "6px 6px 0 #000",

  // 字体 - 几何感
  "--cat-font-heading":
    "'Space Grotesk', 'Noto Sans SC', sans-serif",

  // 背景
  "--cat-bg-primary": "#ffffff",
  "--cat-bg-secondary": "#f0f0f0",
  "--cat-bg-card": "#ffffff",

  // 文字
  "--cat-text-primary": "#000000",
  "--cat-text-secondary": "#333333",
  "--cat-text-accent": "#0000ff",

  // 间距 - 紧凑
  "--cat-spacing-xs": "4px",
  "--cat-spacing-sm": "8px",
  "--cat-spacing-md": "12px",
  "--cat-spacing-lg": "20px",
  "--cat-spacing-xl": "28px",

  // 过渡 - 快速直接
  "--cat-transition-fast": "100ms ease-out",
  "--cat-transition-base": "200ms ease-out",
};
