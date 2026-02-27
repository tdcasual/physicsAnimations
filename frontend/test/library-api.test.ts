import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLibraryFolder,
  listLibraryCatalog,
  uploadLibraryAsset,
} from "../src/features/library/libraryApi";

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

describe("libraryApi", () => {
  it("listLibraryCatalog requests public catalog endpoint", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ folders: [] }));
    globalThis.fetch = fetchMock as typeof fetch;

    const data = await listLibraryCatalog();
    expect(Array.isArray(data.folders)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/catalog");
    expect(options?.method).toBe("GET");
  });

  it("createLibraryFolder attaches auth header", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, folder: { id: "f_1", name: "F" } }));
    globalThis.fetch = fetchMock as typeof fetch;

    await createLibraryFolder({
      name: "Folder A",
      categoryId: "other",
      coverType: "blank",
    });

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/folders");
    expect(options?.method).toBe("POST");
    const headers = options?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-lib-1");
  });

  it("uploadLibraryAsset posts multipart payload with openMode", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, asset: { id: "a_1" } }));
    globalThis.fetch = fetchMock as typeof fetch;

    const file = new File(["GGBDATA"], "demo.ggb", { type: "application/vnd.geogebra.file" });
    await uploadLibraryAsset({
      folderId: "f_1",
      file,
      openMode: "download",
    });

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/folders/f_1/assets");
    expect(options?.method).toBe("POST");
    expect(options?.body).toBeInstanceOf(FormData);
    const formData = options?.body as FormData;
    expect(formData.get("openMode")).toBe("download");
  });
});
