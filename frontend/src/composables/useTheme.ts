import { computed, onMounted, readonly, ref } from "vue";

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

    // If user has explicitly chosen a theme, respect it; otherwise follow OS preference
    const resolved = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    themeState.value = resolved;
    applyTheme(resolved);

    // Listen for OS theme changes when no explicit user preference is stored
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        const hasStored = localStorage.getItem(THEME_STORAGE_KEY) !== null;
        if (hasStored) return; // User has explicitly chosen, don't override
      } catch {
        // ignore
      }
      const newTheme: Theme = e.matches ? "dark" : "light";
      themeState.value = newTheme;
      applyTheme(newTheme);
    };
    mediaQuery.addEventListener("change", handleChange);
  });

  return {
    theme: readonly(themeState),
    isDark,
    setTheme,
    toggleTheme,
  };
}
