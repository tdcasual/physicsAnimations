import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeCatalog, loadCatalogData, DEFAULT_GROUP_ID } from "../src/features/catalog/catalogService";

describe("normalizeCatalog", () => {
  it("returns catalog as-is when groups object exists", () => {
    const catalog = {
      groups: {
        physics: { id: "physics", title: "物理", order: 0, hidden: false, categories: {} },
      },
    };
    expect(normalizeCatalog(catalog)).toBe(catalog as never);
  });

  it("migrates flat categories into default group", () => {
    const result = normalizeCatalog({
      categories: {
        mechanics: { id: "mechanics", title: "力学", items: [{ id: "m1" }] },
      },
    });
    expect(result.groups[DEFAULT_GROUP_ID]).toBeTruthy();
    expect(result.groups[DEFAULT_GROUP_ID].categories.mechanics.title).toBe("力学");
    expect(result.groups[DEFAULT_GROUP_ID].categories.mechanics.items).toHaveLength(1);
  });

  it("fills missing category fields with defaults", () => {
    const result = normalizeCatalog({
      categories: {
        optics: {},
      },
    });
    const cat = result.groups[DEFAULT_GROUP_ID].categories.optics;
    expect(cat.id).toBe("optics");
    expect(cat.title).toBe("optics");
    expect(cat.groupId).toBe(DEFAULT_GROUP_ID);
    expect(cat.items).toEqual([]);
  });

  it("skips non-object category entries", () => {
    const result = normalizeCatalog({
      categories: {
        good: { id: "good", title: "好" },
        bad: null as never,
        worse: 42 as never,
      },
    });
    expect(Object.keys(result.groups[DEFAULT_GROUP_ID].categories)).toEqual(["good"]);
  });

  it("returns empty groups for null input", () => {
    expect(normalizeCatalog(null)).toEqual({ groups: {} });
  });

  it("returns empty groups for undefined input", () => {
    expect(normalizeCatalog(undefined)).toEqual({ groups: {} });
  });

  it("returns empty groups for empty object", () => {
    expect(normalizeCatalog({})).toEqual({ groups: {} });
  });
});

describe("loadCatalogData", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("handles aborted requests", async () => {
    globalThis.fetch = vi.fn(async (_input, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        const err = new Error("Aborted");
        err.name = "AbortError";
        throw err;
      }
      return new Response(JSON.stringify({ groups: {} }), { headers: { "content-type": "application/json" } });
    });

    const controller = new AbortController();
    controller.abort();
    const result = await loadCatalogData(controller.signal);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("request_failed");
    }
  });

  it("passes signal to fetch", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ groups: {} }), { headers: { "content-type": "application/json" } }),
    );
    globalThis.fetch = fetchMock;

    const controller = new AbortController();
    await loadCatalogData(controller.signal);
    expect(fetchMock).toHaveBeenCalledWith("/api/catalog", expect.objectContaining({ signal: controller.signal }));
  });
});
