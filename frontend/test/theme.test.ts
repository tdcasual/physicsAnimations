import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initTheme, toggleTheme, applyTheme, type Theme } from "../src/features/theme/theme";

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

// Mock matchMedia
Object.defineProperty(globalThis, "matchMedia", {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
});

beforeEach(() => {
  storage.clear();
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    configurable: true,
  });
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.classroom;
});

afterEach(() => {
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.classroom;
});

describe("theme persistence", () => {
  it("initTheme applies saved theme from localStorage", () => {
    localStorage.setItem("pa_theme", "dark");
    const result = initTheme();
    expect(result.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("initTheme defaults to system when no theme saved", () => {
    const result = initTheme();
    expect(result.theme).toBe("system");
  });

  it("toggle switches between light/dark/system", () => {
    let current: Theme = "light";
    
    current = toggleTheme(current);
    expect(current).toBe("dark");
    expect(localStorage.getItem("pa_theme")).toBe("dark");
    
    current = toggleTheme(current);
    expect(current).toBe("system");
    expect(localStorage.getItem("pa_theme")).toBe("system");
    
    current = toggleTheme(current);
    expect(current).toBe("light");
    expect(localStorage.getItem("pa_theme")).toBe("light");
  });

  it("applyTheme sets theme directly", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("pa_theme")).toBe("dark");
  });
});
