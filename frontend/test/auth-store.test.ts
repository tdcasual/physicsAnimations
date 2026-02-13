import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAuthStore } from "../src/features/auth/useAuthStore";

const originalFetch = globalThis.fetch;

function mockJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
  sessionStorage.clear();
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("useAuthStore", () => {
  it("login succeeds and exposes admin state", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/login")) {
        return mockJsonResponse({ token: "token-123" });
      }
      if (url.includes("/api/auth/me")) {
        return mockJsonResponse({ username: "admin" });
      }
      return new Response("not_found", { status: 404 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const store = useAuthStore();
    await store.loginWithPassword({ username: "admin", password: "secret" });

    expect(store.loggedIn).toBe(true);
    expect(store.username).toBe("admin");
    expect(sessionStorage.getItem("pa_admin_token")).toBe("token-123");
  });

  it("bootstrap clears stale token when /me rejects", async () => {
    sessionStorage.setItem("pa_admin_token", "stale");
    const fetchMock = vi.fn(async () => {
      return mockJsonResponse({ error: "unauthorized" }, 401);
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const store = useAuthStore();
    await store.bootstrap();

    expect(store.loggedIn).toBe(false);
    expect(store.username).toBe("");
    expect(sessionStorage.getItem("pa_admin_token")).toBeNull();
  });

  it("logout clears token and store state", () => {
    sessionStorage.setItem("pa_admin_token", "token-1");
    const store = useAuthStore();
    store.loggedIn = true;
    store.username = "admin";

    store.logout();

    expect(store.loggedIn).toBe(false);
    expect(store.username).toBe("");
    expect(sessionStorage.getItem("pa_admin_token")).toBeNull();
  });
});
