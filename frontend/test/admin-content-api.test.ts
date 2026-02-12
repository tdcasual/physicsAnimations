import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLinkItem,
  createCategory,
  createGroup,
  deleteCategory,
  deleteAdminItem,
  deleteGroup,
  getSystemInfo,
  listAdminItems,
  listTaxonomy,
  restoreBuiltinItem,
  updateAccount,
  uploadHtmlItem,
  updateCategory,
  updateAdminItem,
  updateGroup,
  updateSystemStorage,
} from "../src/features/admin/adminApi";

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

describe("adminApi", () => {
  it("listAdminItems sends expected query parameters", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [{ id: "x", type: "link", categoryId: "other", title: "X", description: "", src: "https://example.com" }],
        total: 1,
        page: 2,
        pageSize: 30,
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const data = await listAdminItems({
      page: 2,
      pageSize: 30,
      q: "abc",
      type: "upload",
    });

    expect(data.total).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/items?");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=30");
    expect(url).toContain("q=abc");
    expect(url).toContain("type=upload");
  });

  it("createLinkItem and update/delete attach auth header", async () => {
    sessionStorage.setItem("pa_admin_token", "token-1");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/categories")) {
        return jsonResponse({ groups: [], categories: [] });
      }
      return jsonResponse({ ok: true, id: "l_1" });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await createLinkItem({
      url: "https://example.com",
      categoryId: "other",
      title: "标题",
      description: "描述",
    });
    await updateAdminItem("l_1", { title: "标题2" });
    await deleteAdminItem("l_1");
    await restoreBuiltinItem("builtin_demo");
    await listTaxonomy();

    const authCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/api/items/") || String(call[0]).includes("/api/items/link"),
    );
    expect(authCalls.length).toBeGreaterThan(0);
    for (const call of authCalls) {
      const options = (call[1] || {}) as RequestInit;
      const headers = options.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer token-1");
    }
  });

  it("restoreBuiltinItem sends deleted=false patch", async () => {
    sessionStorage.setItem("pa_admin_token", "token-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    globalThis.fetch = fetchMock as typeof fetch;

    await restoreBuiltinItem("builtin_demo");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/items/builtin_demo");
    expect(options.method).toBe("PUT");
    expect(options.body).toBe(JSON.stringify({ deleted: false }));
  });

  it("uploadHtmlItem posts multipart payload", async () => {
    sessionStorage.setItem("pa_admin_token", "token-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, id: "u_1" }));
    globalThis.fetch = fetchMock as typeof fetch;

    const file = new File(["<html></html>"], "demo.html", { type: "text/html" });
    await uploadHtmlItem({
      file,
      categoryId: "other",
      title: "Demo",
      description: "Desc",
    });

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/items/upload");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("group/category CRUD methods use expected routes", async () => {
    sessionStorage.setItem("pa_admin_token", "token-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    globalThis.fetch = fetchMock as typeof fetch;

    await createGroup({ id: "math", title: "数学", order: 1, hidden: false });
    await updateGroup("math", { title: "数学2" });
    await deleteGroup("math");

    await createCategory({ id: "algebra", groupId: "physics", title: "代数", order: 0, hidden: false });
    await updateCategory("algebra", { title: "代数2" });
    await deleteCategory("algebra");

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toContain("/api/groups");
    expect(urls).toContain("/api/groups/math");
    expect(urls).toContain("/api/categories");
    expect(urls).toContain("/api/categories/algebra");
  });

  it("system/account endpoints use expected routes and payload", async () => {
    sessionStorage.setItem("pa_admin_token", "token-1");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/system")) {
        return jsonResponse({ storage: { mode: "local", webdav: {} } });
      }
      if (url.includes("/api/auth/account")) {
        return jsonResponse({ token: "token-2", username: "admin2" });
      }
      return jsonResponse({ ok: true });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await getSystemInfo();
    await updateSystemStorage({
      mode: "hybrid",
      webdav: { url: "https://dav.example.com", scanRemote: true },
      sync: true,
    });
    const account = await updateAccount({
      currentPassword: "old",
      newUsername: "admin2",
      newPassword: "newpass",
    });

    expect(account.username).toBe("admin2");

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toContain("/api/system");
    expect(urls).toContain("/api/system/storage");
    expect(urls).toContain("/api/auth/account");
  });
});
