/**
 * 极简主题 - 基础主题
 * 其他主题可以继承这个基础
 */
import type { CatalogThemeConfig } from "../types";

export const minimalTheme: CatalogThemeConfig = {
  id: "minimal",
  label: "极简",
  icon: "◻",
  description: "现代极简风格，干净专业",
};

// CSS 变量定义
export const minimalVars = {
  // 边框
  "--cat-border-radius": "4px",
  "--cat-border-radius-lg": "8px",
  "--cat-border-width": "1px",
  "--cat-border-color": "var(--border, #e5e5e8)",
  "--cat-border-color-strong": "var(--foreground, #1a1a1a)",

  // 阴影
  "--cat-shadow-sm": "0 1px 2px rgba(0, 0, 0, 0.05)",
  "--cat-shadow": "0 1px 3px rgba(0, 0, 0, 0.1)",
  "--cat-shadow-lg": "0 4px 6px rgba(0, 0, 0, 0.1)",

  // 字体
  "--cat-font-heading":
    "var(--font-display, 'Playfair Display', 'Noto Serif SC', serif)",
  "--cat-font-body":
    "var(--font-body, 'Inter', 'Noto Sans SC', sans-serif)",

  // 背景
  "--cat-bg-primary": "var(--background, #ffffff)",
  "--cat-bg-secondary": "var(--muted, #f8f8f8)",
  "--cat-bg-card": "var(--card, #ffffff)",

  // 文字
  "--cat-text-primary": "var(--foreground, #1a1a1a)",
  "--cat-text-secondary": "var(--muted-foreground, #666666)",
  "--cat-text-accent": "var(--primary, #1a1a1a)",

  // 间距
  "--cat-spacing-xs": "4px",
  "--cat-spacing-sm": "8px",
  "--cat-spacing-md": "16px",
  "--cat-spacing-lg": "24px",
  "--cat-spacing-xl": "32px",

  // 过渡
  "--cat-transition-fast": "150ms ease",
  "--cat-transition-base": "300ms ease",
};
