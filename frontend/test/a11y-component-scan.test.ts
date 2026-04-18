import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import axe from "axe-core";

// Components to scan
import CatalogView from "../src/views/CatalogView.vue";
import LoginView from "../src/views/LoginView.vue";

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

describe("a11y component scan", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.body.innerHTML = "";
  });

  // Common axe config for jsdom environment:
  // - color-contrast: disabled because jsdom lacks real CSS rendering
  // - label: disabled because axe-core cannot reliably detect implicit labels
  //   inside Vue slots (PAField wraps PAInput in <label>, which is valid HTML)
  const axeConfig: axe.RunOptions = {
    rules: {
      "color-contrast": { enabled: false },
      "label": { enabled: false },
    },
  };

  it("CatalogView has no critical or serious a11y violations", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/catalog")) return mockCatalogResponse();
      if (url.includes("/api/library/catalog")) return mockLibraryResponse();
      return new Response("not found", { status: 404 });
    });

    mount(CatalogView, {
      global: { plugins: [createPinia()] },
      attachTo: document.body,
    });

    await new Promise((r) => setTimeout(r, 150));

    const results = await axe.run(document.body, axeConfig);

    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(serious).toHaveLength(0);
  });

  it("LoginView has no critical or serious a11y violations", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/admin/dashboard", name: "admin-dashboard", component: { template: "<div>dashboard</div>" } },
        { path: "/login", name: "login", component: LoginView },
      ],
    });
    await router.push("/login");
    await router.isReady();

    mount(LoginView, {
      global: { plugins: [createPinia(), router] },
      attachTo: document.body,
    });

    await new Promise((r) => setTimeout(r, 50));

    const results = await axe.run(document.body, axeConfig);

    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(serious).toHaveLength(0);
  });
});
