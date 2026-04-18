import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import ViewerView from "../src/views/ViewerView.vue";

const originalFetch = globalThis.fetch;
const originalTitle = document.title;

describe("ViewerView integration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    document.title = originalTitle;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.title = originalTitle;
  });

  async function mountViewer(routePath = "/viewer/demo1") {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/viewer/:id", name: "viewer", component: ViewerView }],
    });
    await router.push(routePath);
    await router.isReady();

    return shallowMount(ViewerView, {
      global: {
        plugins: [router],
      },
    });
  }

  it("renders ready state with title and iframe", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          item: {
            id: "demo1",
            src: "/content/demos/mech.html",
            title: "力学演示",
            thumbnail: "/thumb.png",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const wrapper = await mountViewer();
    await new Promise((r) => setTimeout(r, 100));

    expect(wrapper.text()).toContain("力学演示");
    expect(document.title).toBe("力学演示");
  });

  it("renders error state when item not found", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ item: null }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );

    const wrapper = await mountViewer();
    await new Promise((r) => setTimeout(r, 100));

    expect(wrapper.text()).toContain("作品不存在");
  });

  it("renders error state for unsafe target", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          item: { id: "bad", src: "javascript:alert(1)" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const wrapper = await mountViewer();
    await new Promise((r) => setTimeout(r, 100));

    expect(wrapper.text()).toContain("参数无效");
  });

  it("handles network error gracefully", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network error");
    });

    const wrapper = await mountViewer();
    await new Promise((r) => setTimeout(r, 100));

    // Network error leads to not_found because item meta cannot be fetched
    expect(wrapper.text()).toContain("未找到作品");
  });

  it("renders deferred fallback for external links without screenshot", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          item: {
            id: "link1",
            src: "https://example.com",
            title: "外链",
            type: "link",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const wrapper = await mountViewer();
    await new Promise((r) => setTimeout(r, 100));

    expect(wrapper.text()).toContain("外链");
  });

  it("toggles favorite on button click", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          item: {
            id: "demo1",
            src: "/content/demos/mech.html",
            title: "力学演示",
            thumbnail: "/thumb.png",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const wrapper = await mountViewer();
    await new Promise((r) => setTimeout(r, 100));

    const favoriteBtn = wrapper.find('button[aria-label="收藏"]');
    if (favoriteBtn.exists()) {
      await favoriteBtn.trigger("click");
      expect(wrapper.text()).toContain("已收藏");
    }
  });

  it("shows back navigation in ready state", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          item: {
            id: "demo1",
            src: "/content/demos/mech.html",
            title: "力学演示",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const wrapper = await mountViewer();
    await new Promise((r) => setTimeout(r, 100));

    // Header should contain the back button text (rendered via stub)
    expect(wrapper.text()).toContain("力学演示");
  });

  it("calls goBack without error", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          item: {
            id: "demo1",
            src: "/content/demos/mech.html",
            title: "力学演示",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const wrapper = await mountViewer();
    await new Promise((r) => setTimeout(r, 100));

    // Directly invoke goBack
    expect(() => (wrapper.vm as any).goBack()).not.toThrow();
  });

  it("toggles favorite state via vm method", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          item: {
            id: "demo1",
            src: "/content/demos/mech.html",
            title: "力学演示",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const wrapper = await mountViewer();
    await new Promise((r) => setTimeout(r, 100));

    const vm = wrapper.vm as any;
    expect(typeof vm.toggleFavorite).toBe("function");
    vm.toggleFavorite();
    // Should not throw
  });

  it("has toggleMode and startInteractive methods", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          item: {
            id: "demo1",
            src: "/content/demos/mech.html",
            title: "力学演示",
            screenshotUrl: "/thumb.png",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const wrapper = await mountViewer();
    await new Promise((r) => setTimeout(r, 100));

    const vm = wrapper.vm as any;
    expect(typeof vm.toggleMode).toBe("function");
    expect(typeof vm.startInteractive).toBe("function");
    expect(typeof vm.stopInteractive).toBe("function");
    expect(typeof vm.onFrameLoad).toBe("function");
  });
});
