import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCatalogData } from "../src/features/catalog/catalogService";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("loadCatalogData", () => {
  it("loads and normalizes /api/catalog response", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          categories: {
            mechanics: {
              id: "mechanics",
              title: "力学",
              items: [],
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    globalThis.fetch = fetchMock as typeof fetch;

    const result = await loadCatalogData();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected successful catalog load");
    expect(result.catalog.groups.physics).toBeTruthy();
    expect(result.catalog.groups.physics?.categories.mechanics?.title).toBe("力学");
    expect(fetchMock).toHaveBeenCalledWith("/api/catalog", expect.any(Object));
  });

  it("surfaces request failure instead of pretending the catalog is empty", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/catalog")) {
        return new Response("failed", { status: 500 });
      }
      return new Response("not_found", { status: 404 });
    });

    globalThis.fetch = fetchMock as typeof fetch;

    const result = await loadCatalogData();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed catalog load");
    expect(result.catalog.groups).toEqual({});
    expect(result.error).toBe("request_failed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
