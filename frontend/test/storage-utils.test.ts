import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStorageItem,
  getStorageObject,
  removeStorageItem,
  setStorageItem,
  setStorageObject,
} from "../src/lib/storage";

describe("storage utils", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getStorageItem", () => {
    it("reads stored string values", () => {
      localStorage.setItem("key_a", "hello");
      expect(getStorageItem("key_a")).toBe("hello");
    });

    it("returns null for missing keys", () => {
      expect(getStorageItem("missing_key")).toBeNull();
    });

    it("returns null when localStorage throws", () => {
      const mock = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
        throw new Error("private mode");
      });
      expect(getStorageItem("any")).toBeNull();
      mock.mockRestore();
    });
  });

  describe("setStorageItem", () => {
    it("writes string values", () => {
      setStorageItem("key_b", "world");
      expect(localStorage.getItem("key_b")).toBe("world");
    });

    it("warns on quota exceeded and attempts cleanup", () => {
      let attempts = 0;
      const originalSetItem = localStorage.setItem.bind(localStorage);
      // Pre-seed a cleanup candidate so removal succeeds
      originalSetItem("pa_recent_activity", "old");

      const mock = vi.spyOn(localStorage, "setItem").mockImplementation((key: string, value: string) => {
        attempts++;
        if (attempts <= 2) {
          const err = new Error("quota exceeded");
          (err as Error).name = "QuotaExceededError";
          throw err;
        }
        originalSetItem(key, value);
      });

      setStorageItem("key_c", "value");
      expect(console.warn).toHaveBeenCalled();
      mock.mockRestore();
    });

    it("warns when cleanup fails to free space", () => {
      const mock = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        const err = new Error("quota exceeded");
        (err as Error).name = "QuotaExceededError";
        throw err;
      });

      setStorageItem("key_d", "value");
      expect(console.warn).toHaveBeenCalled();
      mock.mockRestore();
    });

    it("handles private mode errors silently", () => {
      const mock = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        const err = new Error("private mode");
        (err as Error).name = "SecurityError";
        throw err;
      });

      setStorageItem("key_e", "value");
      expect(console.warn).toHaveBeenCalled();
      mock.mockRestore();
    });

    it("handles unknown storage errors", () => {
      const mock = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("something weird");
      });

      setStorageItem("key_f", "value");
      expect(console.warn).toHaveBeenCalled();
      mock.mockRestore();
    });
  });

  describe("removeStorageItem", () => {
    it("removes existing keys", () => {
      localStorage.setItem("key_g", "value");
      removeStorageItem("key_g");
      expect(localStorage.getItem("key_g")).toBeNull();
    });

    it("ignores errors silently", () => {
      const mock = vi.spyOn(localStorage, "removeItem").mockImplementation(() => {
        throw new Error("private mode");
      });
      expect(() => removeStorageItem("any")).not.toThrow();
      mock.mockRestore();
    });
  });

  describe("getStorageObject", () => {
    it("parses valid JSON", () => {
      localStorage.setItem("obj_key", '{"a":1}');
      expect(getStorageObject("obj_key")).toEqual({ a: 1 });
    });

    it("returns null for missing keys", () => {
      expect(getStorageObject("missing_obj")).toBeNull();
    });

    it("returns null for invalid JSON", () => {
      localStorage.setItem("bad_json", "not json");
      expect(getStorageObject("bad_json")).toBeNull();
    });
  });

  describe("setStorageObject", () => {
    it("serializes objects to JSON", () => {
      setStorageObject("obj_b", { x: [1, 2] });
      expect(localStorage.getItem("obj_b")).toBe('{"x":[1,2]}');
    });
  });
});
