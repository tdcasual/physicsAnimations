/**
 * Catalog 首页主题类型
 * 与全局 dark/light 主题独立
 */
export type CatalogTheme = "minimal" | "handdrawn" | "brutalist";

export interface CatalogThemeConfig {
  id: CatalogTheme | string;  // 允许扩展新的主题 ID
  label: string;
  icon: string;
  description: string;
}

const CATALOG_THEME_KEY = "pa_catalog_theme";

export function getStoredCatalogTheme(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(CATALOG_THEME_KEY);
}

export function setStoredCatalogTheme(theme: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(CATALOG_THEME_KEY, theme);
}

/**
 * 验证主题 ID 是否有效
 * 当添加新主题时，需要在这里注册
 */
export function isValidCatalogTheme(theme: string): boolean {
  const validThemes: string[] = ["minimal", "handdrawn", "brutalist"];
  return validThemes.includes(theme);
}
