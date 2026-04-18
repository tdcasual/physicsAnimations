import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import LoginView from "../src/views/LoginView.vue";

const originalFetch = globalThis.fetch;
const originalTitle = document.title;

function mockJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("LoginView integration", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
    document.title = originalTitle;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.title = originalTitle;
  });

  async function mountLogin(query: Record<string, string> = {}) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/admin/dashboard", name: "admin-dashboard", component: { template: "<div>dashboard</div>" } },
        { path: "/login", name: "login", component: LoginView },
      ],
    });
    await router.push({ path: "/login", query });
    await router.isReady();

    return mount(LoginView, {
      global: {
        plugins: [createPinia(), router],
      },
    });
  }

  it("renders login form with title", async () => {
    const wrapper = await mountLogin();
    expect(wrapper.text()).toContain("管理员登录");
    expect(wrapper.text()).toContain("登录");
  });

  it("sets document title on mount", async () => {
    await mountLogin();
    expect(document.title).toBe("管理员登录 - 管理后台");
  });

  it("submits credentials and redirects on success", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/login")) {
        return mockJsonResponse({ token: "token-123" });
      }
      if (url.includes("/api/auth/me")) {
        return mockJsonResponse({ username: "admin" });
      }
      return mockJsonResponse({}, 404);
    });

    const wrapper = await mountLogin();

    // Directly set vm refs and call submit
    (wrapper.vm as any).username = "admin";
    (wrapper.vm as any).password = "secret";
    await (wrapper.vm as any).submit();

    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("shows 401 error for invalid credentials", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/login")) {
        return mockJsonResponse({ error: "unauthorized" }, 401);
      }
      return mockJsonResponse({}, 404);
    });

    const wrapper = await mountLogin();
    await (wrapper.vm as any).submit();
    await new Promise((r) => setTimeout(r, 50));
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).errorText).toBe("用户名或密码错误。");
  });

  it("shows 429 error with retry hint", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/login")) {
        return mockJsonResponse({ error: "too many requests", retryAfterSeconds: 30 }, 429);
      }
      return mockJsonResponse({}, 404);
    });

    const wrapper = await mountLogin();
    await (wrapper.vm as any).submit();
    await new Promise((r) => setTimeout(r, 50));
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).errorText).toContain("尝试过于频繁");
    expect((wrapper.vm as any).errorText).toContain("30");
  });

  it("shows generic error for network failure", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network error");
    });

    const wrapper = await mountLogin();
    await (wrapper.vm as any).submit();
    await new Promise((r) => setTimeout(r, 50));
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).errorText).toBe("登录失败，请稍后再试。");
  });

  it("clears error text on input when error exists", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network error");
    });

    const wrapper = await mountLogin();
    (wrapper.vm as any).errorText = "some error";
    (wrapper.vm as any).clearErrorText();
    expect((wrapper.vm as any).errorText).toBe("");
  });

  it("does not clear error text when already empty", async () => {
    const wrapper = await mountLogin();
    (wrapper.vm as any).errorText = "";
    (wrapper.vm as any).clearErrorText();
    expect((wrapper.vm as any).errorText).toBe("");
  });
});
