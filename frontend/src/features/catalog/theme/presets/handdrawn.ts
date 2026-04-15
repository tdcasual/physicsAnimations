/**
 * 手绘主题
 * 继承极简主题，覆盖特定变量
 */
import type { CatalogThemeConfig } from "../types";

export const handdrawnTheme: CatalogThemeConfig = {
  id: "handdrawn",
  label: "手绘",
  icon: "✎",
  description: "温暖手绘风格，亲切有机",
};

// CSS 变量定义（仅覆盖与默认不同的）
export const handdrawnVars = {
  // 边框 - 不规则圆角
  "--cat-border-radius": "255px 15px 225px 15px / 15px 225px 15px 255px",
  "--cat-border-radius-lg": "255px 25px 225px 25px / 25px 225px 25px 255px",
  "--cat-border-width": "2px",
  "--cat-border-color": "#3a3a3a",
  "--cat-border-color-strong": "#1a1a1a",

  // 阴影 - 手绘感偏移
  "--cat-shadow-sm": "2px 2px 0 rgba(0, 0, 0, 0.08)",
  "--cat-shadow": "3px 3px 0 rgba(0, 0, 0, 0.1)",
  "--cat-shadow-lg": "4px 4px 0 rgba(0, 0, 0, 0.12)",

  // 字体 - 手写体（需要加载 Google Fonts）
  "--cat-font-heading":
    "'Zeyada', 'Ma Shan Zheng', 'STXingkai', cursive",

  // 背景 - 暖白纸张色
  "--cat-bg-primary": "#faf8f5",
  "--cat-bg-secondary": "#f5f2ed",
  "--cat-bg-card": "#ffffff",

  // 文字 - 略微柔和的深色
  "--cat-text-primary": "#2d2d2d",
  "--cat-text-secondary": "#6b6b6b",
  "--cat-text-accent": "#4a4a4a",

  // 间距 - 稍微宽松
  "--cat-spacing-xs": "6px",
  "--cat-spacing-sm": "10px",
  "--cat-spacing-md": "18px",
  "--cat-spacing-lg": "28px",
  "--cat-spacing-xl": "36px",

  // 过渡 - 更柔和的动画
  "--cat-transition-fast": "200ms cubic-bezier(0.4, 0, 0.2, 1)",
  "--cat-transition-base": "400ms cubic-bezier(0.4, 0, 0.2, 1)",
};

/**
 * 手绘风组件特殊样式
 * 未来可以迁移到完整的组件覆盖系统
 */
export const handdrawnComponents = {
  card: {
    extraClasses: ["sketchy-border"],
    pseudoElement: true,
  },
  button: {
    hoverTransform: "translate(-1px, -1px)",
    activeTransform: "translate(1px, 1px)",
  },
};
