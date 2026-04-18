import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyStoredTheme, toggleTheme } from "../src/features/theme/theme";

describe("theme utils", () => {
  const THEME_KEY = "pa_theme";

  beforeEach(() => {
    localStorage.removeItem(THEME_KEY);
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    localStorage.removeItem(THEME_KEY);
    delete document.documentElement.dataset.theme;
  });

  describe("applyStoredTheme", () => {
    it("applies dark theme from localStorage", () => {
      localStorage.setItem(THEME_KEY, "dark");
      expect(applyStoredTheme()).toBe("dark");
      expect(document.documentElement.dataset.theme).toBe("dark");
    });

    it("applies light theme from localStorage", () => {
      localStorage.setItem(THEME_KEY, "light");
      expect(applyStoredTheme()).toBe("light");
      expect(document.documentElement.dataset.theme).toBe("light");
    });

    it("ignores invalid stored values", () => {
      localStorage.setItem(THEME_KEY, "purple");
      document.documentElement.dataset.theme = "dark";
      expect(applyStoredTheme()).toBe("dark");
    });

    it("falls back to light when nothing stored", () => {
      expect(applyStoredTheme()).toBe("light");
    });

    it("falls back to existing dataset value", () => {
      document.documentElement.dataset.theme = "dark";
      expect(applyStoredTheme()).toBe("dark");
    });
  });

  describe("toggleTheme", () => {
    it("switches from light to dark", () => {
      document.documentElement.dataset.theme = "light";
      expect(toggleTheme()).toBe("dark");
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    });

    it("switches from dark to light", () => {
      document.documentElement.dataset.theme = "dark";
      expect(toggleTheme()).toBe("light");
      expect(document.documentElement.dataset.theme).toBe("light");
      expect(localStorage.getItem(THEME_KEY)).toBe("light");
    });

    it("treats missing dataset as light", () => {
      delete document.documentElement.dataset.theme;
      expect(toggleTheme()).toBe("dark");
    });
  });
});
