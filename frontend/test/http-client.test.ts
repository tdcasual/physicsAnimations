import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetchJson } from "../src/features/shared/httpClient";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

function jsonResponse(payload: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

describe("apiFetchJson", () => {
  it("returns parsed JSON on success", async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ ok: true }));
    const result = await apiFetchJson({ path: "/api/test" });
    expect(result).toEqual({ ok: true });
  });

  it("merges custom headers", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    globalThis.fetch = fetchMock;

    await apiFetchJson({ path: "/api/test", options: { headers: { "X-Custom": "val" } } });
    const [, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers.Accept).toBe("application/json");
    expect(headers["X-Custom"]).toBe("val");
  });

  it("accepts Headers instance", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    globalThis.fetch = fetchMock;

    await apiFetchJson({ path: "/api/test", options: { headers: new Headers({ "X-H": "v" }) } });
    const [, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    // fetch may wrap headers back into Headers, so check via the actual request object
    const request = new Request("http://localhost/api/test", options);
    expect(request.headers.get("X-H")).toBe("v");
  });

  it("accepts headers as array", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    globalThis.fetch = fetchMock;

    await apiFetchJson({ path: "/api/test", options: { headers: [["X-Arr", "v1"]] } });
    const [, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["X-Arr"]).toBe("v1");
  });

  it("attaches bearer token when provided", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    globalThis.fetch = fetchMock;

    await apiFetchJson({ path: "/api/test", token: "tok-1" });
    const [, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok-1");
  });

  it("calls onUnauthorized for 401", async () => {
    const onUnauthorized = vi.fn();
    globalThis.fetch = vi.fn(async () => jsonResponse({ error: "unauthorized" }, 401));

    await expect(apiFetchJson({ path: "/api/test", onUnauthorized })).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("returns null data for non-JSON responses", async () => {
    globalThis.fetch = vi.fn(async () => new Response("plain text", { status: 200 }));
    const result = await apiFetchJson({ path: "/api/test" });
    expect(result).toBeNull();
  });

  it("throws custom error via toError", async () => {
    const toError = vi.fn((status: number, data) => new Error(`custom:${status}:${data?.error}`));
    globalThis.fetch = vi.fn(async () => jsonResponse({ error: "bad" }, 422));

    await expect(apiFetchJson({ path: "/api/test", toError })).rejects.toThrow("custom:422:bad");
    expect(toError).toHaveBeenCalledWith(422, { error: "bad" });
  });

  it("throws fallback error with status and data", async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ error: "server_error" }, 500));

    try {
      await apiFetchJson({ path: "/api/test" });
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as Error).message).toBe("server_error");
      expect((err as Error & { status: number }).status).toBe(500);
      expect((err as Error & { data: { error: string } }).data.error).toBe("server_error");
    }
  });

  it("throws generic fallback when response lacks error field", async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({}, 503));

    await expect(apiFetchJson({ path: "/api/test" })).rejects.toThrow("request_failed");
  });

  it("handles JSON parse failure gracefully", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response("not json", {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
    );

    await expect(apiFetchJson({ path: "/api/test" })).rejects.toThrow("request_failed");
  });
});
