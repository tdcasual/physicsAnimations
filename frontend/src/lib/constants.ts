// 响应式断点
export const BREAKPOINTS = {
  MOBILE: 640,
  TABLET: 900,
  DESKTOP_COMPACT: 960,
  DESKTOP: 1280,
} as const;

// Storage keys（带版本前缀，便于未来迁移）
export const STORAGE_KEYS = {
  ADMIN_TOKEN: "pa_admin_token",
  THEME: "pa_theme",
  CATALOG_VIEW_STATE: "pa_view_state",
  PWA_INSTALL_DISMISSED: "pwa_install_dismissed",
} as const;

// 动画预设
export const ANIMATION_PRESETS = {
  CATALOG_GRID_REVEAL: {
    from: { y: 60, opacity: 0, scale: 0.95 },
    to: { y: 0, opacity: 1, scale: 1 },
    duration: 0.6,
    stagger: 0.08,
    ease: "power3.out",
    scrollTrigger: { start: "top 85%", once: true },
  },
} as const;
