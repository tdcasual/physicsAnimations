import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyStoredTheme, toggleTheme } from "../src/features/theme/theme";

const storage = new Map<string, string>();
const localStorageMock = {
  getItem(key: string) {
    return storage.has(key) ? storage.get(key)! : null;
  },
  setItem(key: string, value: string) {
    storage.set(key, String(value));
  },
  removeItem(key: string) {
    storage.delete(key);
  },
  clear() {
    storage.clear();
  },
};

beforeEach(() => {
  storage.clear();
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    configurable: true,
  });
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

describe("theme persistence", () => {
  it("applies saved theme from localStorage", () => {
    localStorage.setItem("pa_theme", "dark");
    applyStoredTheme();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("toggle switches light/dark and persists", () => {
    document.documentElement.dataset.theme = "light";
    const next = toggleTheme();
    expect(next).toBe("dark");
    expect(localStorage.getItem("pa_theme")).toBe("dark");
  });
});
