import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import { createPinia } from "pinia";
import AdminDashboardView from "../src/views/admin/AdminDashboardView.vue";

const originalFetch = globalThis.fetch;

function mockJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("AdminDashboardView integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockDashboardFetch() {
    return vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/items?") && url.includes("type=upload")) {
        return mockJsonResponse({ total: 3, page: 1, pageSize: 1, items: [] });
      }
      if (url.includes("/api/items?") && url.includes("type=link")) {
        return mockJsonResponse({ total: 2, page: 1, pageSize: 1, items: [] });
      }
      if (url.includes("/api/categories")) {
        return mockJsonResponse({
          groups: [],
          categories: [
            { id: "a", groupId: "g1", title: "力学" },
            { id: "b", groupId: "g1", title: "电磁学" },
          ],
        });
      }
      return mockJsonResponse({}, 404);
    });
  }

  async function mountDashboard() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/admin/dashboard", name: "admin-dashboard", component: AdminDashboardView },
        { path: "/admin/uploads", name: "admin-uploads", component: { template: "<div>uploads</div>" } },
        { path: "/admin/content", name: "admin-content", component: { template: "<div>content</div>" } },
        { path: "/admin/library", name: "admin-library", component: { template: "<div>library</div>" } },
        { path: "/admin/taxonomy", name: "admin-taxonomy", component: { template: "<div>taxonomy</div>" } },
        { path: "/admin/system", name: "admin-system", component: { template: "<div>system</div>" } },
      ],
    });
    await router.push("/admin/dashboard");
    await router.isReady();

    return mount(AdminDashboardView, {
      global: { plugins: [createPinia(), router] },
    });
  }

  it("loads stats after mount and exposes reactive state", async () => {
    globalThis.fetch = mockDashboardFetch();

    const wrapper = await mountDashboard();
    await new Promise((r) => setTimeout(r, 100));
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).stats.total).toBe(5);
    expect((wrapper.vm as any).stats.uploadTotal).toBe(3);
    expect((wrapper.vm as any).stats.linkTotal).toBe(2);
    expect((wrapper.vm as any).stats.categoryTotal).toBe(2);
    expect((wrapper.vm as any).loading).toBe(false);
    expect((wrapper.vm as any).errorText).toBe("");
  });

  it("shows 401 error when stats fetch returns unauthorized", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/items?")) {
        return mockJsonResponse({ error: "unauthorized" }, 401);
      }
      if (url.includes("/api/categories")) {
        return mockJsonResponse({ groups: [], categories: [] });
      }
      return mockJsonResponse({}, 404);
    });

    const wrapper = await mountDashboard();
    await new Promise((r) => setTimeout(r, 100));
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).errorText).toBe("请先登录管理员账号。");
    expect((wrapper.vm as any).loading).toBe(false);
  });

  it("shows generic error when stats fetch fails", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network error");
    });

    const wrapper = await mountDashboard();
    await new Promise((r) => setTimeout(r, 100));
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).errorText).toBe("加载统计失败。");
    expect((wrapper.vm as any).loading).toBe(false);
  });

  it("reloads stats on refresh button click", async () => {
    globalThis.fetch = mockDashboardFetch();

    const wrapper = await mountDashboard();
    await new Promise((r) => setTimeout(r, 100));
    await wrapper.vm.$nextTick();

    const callCountBefore = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    // Find and click the refresh button by its text
    const refreshBtn = wrapper.findAll("button").find((b) => b.text().includes("刷新"));
    expect(refreshBtn).toBeTruthy();
    await refreshBtn!.trigger("click");

    await new Promise((r) => setTimeout(r, 100));
    await wrapper.vm.$nextTick();

    const callCountAfter = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(callCountAfter).toBeGreaterThan(callCountBefore);
  });

  it("computes statCards from stats", async () => {
    globalThis.fetch = mockDashboardFetch();

    const wrapper = await mountDashboard();
    await new Promise((r) => setTimeout(r, 100));
    await wrapper.vm.$nextTick();

    const cards = (wrapper.vm as any).statCards;
    expect(cards).toHaveLength(4);
    expect(cards[0].title).toBe("全部内容");
    expect(cards[0].value).toBe(5);
    expect(cards[1].value).toBe(3);
    expect(cards[2].value).toBe(2);
    expect(cards[3].value).toBe(2);
  });

  it("computes quickActions with routes", async () => {
    const wrapper = await mountDashboard();
    expect((wrapper.vm as any).quickActions).toHaveLength(5);
    expect((wrapper.vm as any).quickActions[0].title).toBe("上传素材");
    expect((wrapper.vm as any).quickActions[0].to).toBe("/admin/uploads");
  });
});
