// 主题系统入口
export type { CatalogTheme, CatalogThemeConfig } from "./types";
export {
  getStoredCatalogTheme,
  setStoredCatalogTheme,
  isValidCatalogTheme,
} from "./types";
export { useCatalogTheme, initCatalogThemeEarly } from "./useCatalogTheme";

// 导出预设主题
export {
  presetThemes,
  themeVarsMap,
  minimalTheme,
  handdrawnTheme,
  brutalistTheme,
} from "./presets";
