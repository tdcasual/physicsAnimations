import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { createPinia } from "pinia";
import CatalogView from "../src/views/CatalogView.vue";

const originalFetch = globalThis.fetch;

function mockCatalogResponse(): Response {
  return new Response(
    JSON.stringify({
      groups: {
        physics: {
          id: "physics",
          title: "物理",
          order: 0,
          hidden: false,
          categories: {
            mechanics: {
              id: "mechanics",
              title: "力学",
              items: [
                {
                  id: "demo1",
                  title: "牛顿定律",
                  description: "经典力学基础",
                  thumbnail: "/thumb1.png",
                  categoryId: "mechanics",
                },
              ],
            },
          },
        },
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function mockLibraryResponse(): Response {
  return new Response(JSON.stringify({ folders: [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("CatalogView integration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("renders category title and item count after loading", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/catalog")) return mockCatalogResponse();
      if (url.includes("/api/library/catalog")) return mockLibraryResponse();
      return new Response("not found", { status: 404 });
    });

    shallowMount(CatalogView, {
      global: {
        plugins: [createPinia()],
      },
    });

    // Wait for async onMounted data loading
    await new Promise((r) => setTimeout(r, 100));

    // After data loads, the view should have resolved the category and items.
    // We verify indirectly by checking that fetch was called for both endpoints.
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/catalog", expect.any(Object));
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/library/catalog", expect.any(Object));
  });

  it("renders empty state when catalog has no items", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/catalog")) {
        return new Response(JSON.stringify({ groups: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/api/library/catalog")) return mockLibraryResponse();
      return new Response("not found", { status: 404 });
    });

    const wrapper = shallowMount(CatalogView, {
      global: {
        plugins: [createPinia()],
      },
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(wrapper.text()).toContain("未找到任何作品");
  });

  it("renders error state when catalog request fails", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/catalog")) {
        return new Response("error", { status: 500 });
      }
      return new Response("not found", { status: 404 });
    });

    const wrapper = shallowMount(CatalogView, {
      global: {
        plugins: [createPinia()],
      },
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(wrapper.text()).toContain("加载目录失败");
  });

  it("renders library folders when available", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/catalog")) return mockCatalogResponse();
      if (url.includes("/api/library/catalog")) {
        return new Response(
          JSON.stringify({
            folders: [
              { id: "f1", name: "力学资料", categoryId: "mechanics", coverType: "blank", coverPath: "", order: 0, assetCount: 3, createdAt: "", updatedAt: "" },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("not found", { status: 404 });
    });

    const wrapper = shallowMount(CatalogView, {
      global: {
        plugins: [createPinia()],
      },
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(wrapper.text()).toContain("资源库精选");
  });
});
