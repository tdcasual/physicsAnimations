/**
 * 主题预设入口
 * 所有内置主题在这里注册
 */
import { minimalTheme, minimalVars } from "./minimal";
import { handdrawnTheme, handdrawnVars } from "./handdrawn";
import { brutalistTheme, brutalistVars } from "./brutalist";
import type { CatalogThemeConfig } from "../types";

// 导出主题配置列表
export const presetThemes: CatalogThemeConfig[] = [
  minimalTheme,
  handdrawnTheme,
  brutalistTheme,
];

// 导出主题变量映射（用于生成 CSS）
export const themeVarsMap: Record<string, Record<string, string>> = {
  minimal: minimalVars,
  handdrawn: handdrawnVars,
  brutalist: brutalistVars,
};

// 导出单个主题（便于按需引入）
export { minimalTheme, minimalVars };
export { handdrawnTheme, handdrawnVars };
export { brutalistTheme, brutalistVars };

/**
 * 添加新主题的步骤：
 *
 * 1. 在 presets/ 目录创建新文件，如：cyberpunk.ts
 * 2. 定义主题配置和变量：
 *    export const cyberpunkTheme = { id: 'cyberpunk', ... }
 *    export const cyberpunkVars = { '--cat-bg-primary': '#0a0a0f', ... }
 * 3. 在本文件导入并添加到 presetThemes 和 themeVarsMap
 * 4. 完成！切换按钮会自动显示新主题
 *
 * 示例：
 * // presets/cyberpunk.ts
 * export const cyberpunkTheme: CatalogThemeConfig = {
 *   id: 'cyberpunk',
 *   label: '赛博',
 *   icon: '⚡',
 *   description: '赛博朋克风格，霓虹未来',
 * };
 *
 * export const cyberpunkVars = {
 *   '--cat-bg-primary': '#0a0a0f',
 *   '--cat-text-primary': '#00ff9d',
 *   '--cat-border-color': '#ff00ff',
 *   // ...
 * };
 */
