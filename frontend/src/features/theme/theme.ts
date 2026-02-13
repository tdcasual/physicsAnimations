const THEME_KEY = "pa_theme";

export function applyStoredTheme(): string {
  const root = document.documentElement;
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") {
    root.dataset.theme = saved;
    return saved;
  }
  return root.dataset.theme || "light";
}

export function toggleTheme(): string {
  const root = document.documentElement;
  const current = root.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  return next;
}
