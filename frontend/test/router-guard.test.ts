import { createMemoryHistory } from "vue-router";
import { afterEach, describe, expect, it } from "vitest";
import { createAppRouter } from "../src/router";

afterEach(() => {
  sessionStorage.clear();
});

describe("admin route guard", () => {
  it("redirects unauthenticated users to /login", async () => {
    const router = createAppRouter({ history: createMemoryHistory("/app/") });
    await router.push("/admin/dashboard");
    await router.isReady();

    expect(router.currentRoute.value.path).toBe("/login");
    expect(router.currentRoute.value.query.redirect).toBe("/admin/dashboard");
  });

  it("allows authenticated users to visit /admin routes", async () => {
    sessionStorage.setItem("pa_admin_token", "token-1");
    const router = createAppRouter({ history: createMemoryHistory("/app/") });
    await router.push("/admin/dashboard");
    await router.isReady();

    expect(router.currentRoute.value.path).toBe("/admin/dashboard");
  });
});
