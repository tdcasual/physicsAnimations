import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isFavoriteDemo,
  parseFavoriteDemos,
  readFavoriteDemos,
  serializeFavoriteDemos,
  toggleFavoriteDemo,
  writeFavoriteDemos,
} from "../src/features/catalog/favorites";

describe("favorites", () => {

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("parseFavoriteDemos", () => {
    it("parses valid JSON array", () => {
      const result = parseFavoriteDemos(JSON.stringify([{ id: "a", favoritedAt: 1 }]));
      expect(result).toEqual([{ id: "a", favoritedAt: 1 }]);
    });

    it("returns empty for null input", () => {
      expect(parseFavoriteDemos(null)).toEqual([]);
    });

    it("returns empty for undefined input", () => {
      expect(parseFavoriteDemos(undefined)).toEqual([]);
    });

    it("returns empty for non-array JSON", () => {
      expect(parseFavoriteDemos('{"a":1}')).toEqual([]);
    });

    it("returns empty for invalid JSON", () => {
      expect(parseFavoriteDemos("not json")).toEqual([]);
    });

    it("filters out invalid entries", () => {
      const result = parseFavoriteDemos(
        JSON.stringify([
          { id: "good", favoritedAt: 1 },
          { id: "", favoritedAt: 1 },
          { id: "bad-time", favoritedAt: -1 },
          { id: "bad-time2", favoritedAt: "x" },
          null,
          "string",
        ]),
      );
      expect(result).toEqual([{ id: "good", favoritedAt: 1 }]);
    });
  });

  describe("serializeFavoriteDemos", () => {
    it("serializes entries to JSON", () => {
      const entries = [{ id: "a", favoritedAt: 1 }];
      expect(serializeFavoriteDemos(entries)).toBe('[{"id":"a","favoritedAt":1}]');
    });

    it("handles empty array", () => {
      expect(serializeFavoriteDemos([])).toBe("[]");
    });

    it("sanitizes bad data", () => {
      const result = JSON.parse(serializeFavoriteDemos([{ id: "  a  ", favoritedAt: NaN } as never]));
      expect(result[0].id).toBe("a");
      expect(result[0].favoritedAt).toBe(0);
    });
  });

  describe("read/writeFavoriteDemos", () => {
    it("round-trips through localStorage", () => {
      writeFavoriteDemos([{ id: "x", favoritedAt: 1000 }]);
      expect(readFavoriteDemos()).toEqual([{ id: "x", favoritedAt: 1000 }]);
    });

    it("read returns empty on localStorage failure", () => {
      vi.spyOn(localStorage, "getItem").mockImplementation(() => {
        throw new Error("private mode");
      });
      expect(readFavoriteDemos()).toEqual([]);
    });

    it("write silently ignores localStorage failure", () => {
      vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("quota");
      });
      expect(() => writeFavoriteDemos([{ id: "x", favoritedAt: 1 }])).not.toThrow();
    });
  });

  describe("isFavoriteDemo", () => {
    it("returns true for favorited id", () => {
      writeFavoriteDemos([{ id: "demo1", favoritedAt: 1 }]);
      expect(isFavoriteDemo("demo1")).toBe(true);
    });

    it("returns false for non-favorited id", () => {
      expect(isFavoriteDemo("demo2")).toBe(false);
    });

    it("returns false for empty id", () => {
      expect(isFavoriteDemo("")).toBe(false);
    });
  });

  describe("toggleFavoriteDemo", () => {
    it("adds a new favorite", () => {
      const result = toggleFavoriteDemo("demo1", { now: 1000 });
      expect(result.isFavorite).toBe(true);
      expect(result.entries).toEqual([{ id: "demo1", favoritedAt: 1000 }]);
    });

    it("removes an existing favorite", () => {
      toggleFavoriteDemo("demo1", { now: 1000 });
      const result = toggleFavoriteDemo("demo1");
      expect(result.isFavorite).toBe(false);
      expect(result.entries).toEqual([]);
    });

    it("returns current entries for empty id", () => {
      toggleFavoriteDemo("demo1", { now: 1000 });
      const result = toggleFavoriteDemo("");
      expect(result.isFavorite).toBe(false);
      expect(result.entries).toEqual([{ id: "demo1", favoritedAt: 1000 }]);
    });

    it("enforces limit", () => {
      toggleFavoriteDemo("a", { now: 1, limit: 2 });
      toggleFavoriteDemo("b", { now: 2, limit: 2 });
      const result = toggleFavoriteDemo("c", { now: 3, limit: 2 });
      expect(result.entries.length).toBe(2);
      expect(result.entries[0].id).toBe("c");
    });

    it("toggle removes then re-adds at top", () => {
      toggleFavoriteDemo("a", { now: 1 });
      // Toggle removes existing
      const removed = toggleFavoriteDemo("a", { now: 2 });
      expect(removed.isFavorite).toBe(false);
      expect(removed.entries).toEqual([]);
      // Re-add
      const readded = toggleFavoriteDemo("a", { now: 3 });
      expect(readded.isFavorite).toBe(true);
      expect(readded.entries.length).toBe(1);
      expect(readded.entries[0].favoritedAt).toBe(3);
    });
  });
});
