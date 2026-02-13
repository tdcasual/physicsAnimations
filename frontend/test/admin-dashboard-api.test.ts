import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDashboardStats } from "../src/features/admin/adminApi";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  sessionStorage.clear();
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("fetchDashboardStats", () => {
  it("loads totals from items and taxonomy APIs", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/items?") && url.includes("type=upload")) {
        return jsonResponse({ total: 3, page: 1, pageSize: 1, items: [] });
      }
      if (url.includes("/api/items?") && url.includes("type=link")) {
        return jsonResponse({ total: 2, page: 1, pageSize: 1, items: [] });
      }
      if (url.includes("/api/items?")) {
        return jsonResponse({ total: 5, page: 1, pageSize: 1, items: [] });
      }
      if (url.includes("/api/categories")) {
        return jsonResponse({
          groups: [],
          categories: [
            { id: "a", builtinCount: 4 },
            { id: "b", builtinCount: 1 },
          ],
        });
      }
      return jsonResponse({}, 404);
    });

    globalThis.fetch = fetchMock as typeof fetch;

    const stats = await fetchDashboardStats();
    expect(stats.dynamicTotal).toBe(5);
    expect(stats.uploadTotal).toBe(3);
    expect(stats.linkTotal).toBe(2);
    expect(stats.builtinTotal).toBe(5);
    expect(stats.categoryTotal).toBe(2);
    expect(stats.total).toBe(10);
  });
});
