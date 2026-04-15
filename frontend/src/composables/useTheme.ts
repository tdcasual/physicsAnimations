import { computed, onMounted, readonly, ref, watch } from "vue";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "pa-theme";
const themeState = ref<Theme>("light");

export function useTheme() {
  const isDark = computed(() => themeState.value === "dark");

  function applyTheme(theme: Theme) {
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }

  function setTheme(theme: Theme) {
    themeState.value = theme;
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }

  function toggleTheme() {
    setTheme(isDark.value ? "light" : "dark");
  }

  onMounted(() => {
    let stored: Theme | null = null;
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw === "dark" || raw === "light") {
        stored = raw;
      }
    } catch {
      // ignore
    }

    // Default to light as requested
    const resolved = stored ?? "light";
    themeState.value = resolved;
    applyTheme(resolved);
  });

  return {
    theme: readonly(themeState),
    isDark,
    setTheme,
    toggleTheme,
  };
}
