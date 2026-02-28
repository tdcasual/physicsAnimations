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

    const catalog = await loadCatalogData();
    expect(catalog.groups.physics).toBeTruthy();
    expect(catalog.groups.physics?.categories.mechanics?.title).toBe("力学");
    expect(fetchMock).toHaveBeenCalledWith("/api/catalog", expect.any(Object));
  });

  it("falls back to animations.json when /api/catalog fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/catalog")) {
        return new Response("failed", { status: 500 });
      }
      return new Response(
        JSON.stringify({
          mechanics: {
            title: "力学",
            items: [
              {
                file: "mechanics/demo.html",
                title: "演示",
                description: "说明",
                thumbnail: "animations/thumbnails/demo.png",
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    globalThis.fetch = fetchMock as typeof fetch;

    const catalog = await loadCatalogData();
    const item = catalog.groups.physics?.categories.mechanics?.items?.[0];

    expect(item?.id).toBe("mechanics/demo.html");
    expect(item?.src).toBe("animations/mechanics/demo.html");
    expect(item?.href).toBe("/viewer/mechanics%2Fdemo.html");
    expect(item?.type).toBe("builtin");
  });
});
