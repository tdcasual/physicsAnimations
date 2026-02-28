import { createMemoryHistory } from "vue-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppRouter } from "../src/router";

const originalFetch = globalThis.fetch;

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("admin route guard", () => {
  it("redirects unauthenticated users to /login", async () => {
    const router = createAppRouter({ history: createMemoryHistory("/") });
    await router.push("/admin/dashboard");
    await router.isReady();

    expect(router.currentRoute.value.path).toBe("/login");
    expect(router.currentRoute.value.query.redirect).toBe("/admin/dashboard");
  });

  it("allows authenticated users to visit /admin routes", async () => {
    sessionStorage.setItem("pa_admin_token", "token-1");
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ username: "admin" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as typeof fetch;

    const router = createAppRouter({ history: createMemoryHistory("/") });
    await router.push("/admin/dashboard");
    await router.isReady();

    expect(router.currentRoute.value.path).toBe("/admin/dashboard");
  });

  it("redirects stale-token users to /login and clears token", async () => {
    sessionStorage.setItem("pa_admin_token", "stale");
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    ) as typeof fetch;

    const router = createAppRouter({ history: createMemoryHistory("/") });
    await router.push("/admin/dashboard");
    await router.isReady();

    expect(router.currentRoute.value.path).toBe("/login");
    expect(router.currentRoute.value.query.redirect).toBe("/admin/dashboard");
    expect(sessionStorage.getItem("pa_admin_token")).toBeNull();
  });

  it("redirects authenticated users away from /login to /admin/dashboard", async () => {
    sessionStorage.setItem("pa_admin_token", "token-1");
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ username: "admin" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as typeof fetch;

    const router = createAppRouter({ history: createMemoryHistory("/") });
    await router.push("/login");
    await router.isReady();

    expect(router.currentRoute.value.path).toBe("/admin/dashboard");
  });

  it("keeps redirect query string when leaving /login with valid session", async () => {
    sessionStorage.setItem("pa_admin_token", "token-1");
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ username: "admin" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as typeof fetch;

    const router = createAppRouter({ history: createMemoryHistory("/") });
    await router.push("/login?redirect=%2Fadmin%2Fcontent%3Ffoo%3D1");
    await router.isReady();

    expect(router.currentRoute.value.path).toBe("/admin/content");
    expect(router.currentRoute.value.query.foo).toBe("1");
  });

  it("keeps stale-token users on /login and clears token", async () => {
    sessionStorage.setItem("pa_admin_token", "stale");
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    ) as typeof fetch;

    const router = createAppRouter({ history: createMemoryHistory("/") });
    await router.push("/login");
    await router.isReady();

    expect(router.currentRoute.value.path).toBe("/login");
    expect(sessionStorage.getItem("pa_admin_token")).toBeNull();
  });
});
