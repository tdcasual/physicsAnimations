import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLibraryEmbedProfile,
  createLibraryFolder,
  deleteLibraryAsset,
  deleteLibraryAssetPermanently,
  deleteLibraryEmbedProfile,
  listLibraryCatalog,
  listLibraryDeletedAssets,
  listLibraryEmbedProfiles,
  restoreLibraryAsset,
  syncLibraryEmbedProfile,
  updateLibraryAsset,
  updateLibraryFolder,
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

  it("uploadLibraryAsset defaults openMode to embed when omitted", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, asset: { id: "a_2" } }));
    globalThis.fetch = fetchMock as typeof fetch;

    const file = new File(["GGBDATA"], "demo.ggb", { type: "application/vnd.geogebra.file" });
    await uploadLibraryAsset({
      folderId: "f_1",
      file,
      openMode: undefined as any,
    });

    const [, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(options?.body).toBeInstanceOf(FormData);
    const formData = options?.body as FormData;
    expect(formData.get("openMode")).toBe("embed");
  });

  it("uploadLibraryAsset sends displayName when provided", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, asset: { id: "a_3" } }));
    globalThis.fetch = fetchMock as typeof fetch;

    const file = new File(["GGBDATA"], "demo.ggb", { type: "application/vnd.geogebra.file" });
    await uploadLibraryAsset({
      folderId: "f_1",
      file,
      openMode: "download",
      displayName: "自由落体演示",
    } as any);

    const [, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    const formData = options?.body as FormData;
    expect(formData.get("displayName")).toBe("自由落体演示");
  });

  it("uploadLibraryAsset sends embed profile id and json options", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, asset: { id: "a_4" } }));
    globalThis.fetch = fetchMock as typeof fetch;

    const file = new File(["SCENE"], "scene.json", { type: "application/json" });
    await uploadLibraryAsset({
      folderId: "f_1",
      file,
      openMode: "embed",
      embedProfileId: "ep_1",
      embedOptionsJson: "{\"mode\":\"view\"}",
    } as any);

    const [, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    const formData = options?.body as FormData;
    expect(formData.get("embedProfileId")).toBe("ep_1");
    expect(formData.get("embedOptionsJson")).toBe("{\"mode\":\"view\"}");
  });

  it("listLibraryEmbedProfiles calls embed profile endpoint", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ profiles: [{ id: "ep_1", name: "Field", syncStatus: "ok" }] }));
    globalThis.fetch = fetchMock as typeof fetch;

    const data = await listLibraryEmbedProfiles();
    expect(data.length).toBe(1);
    expect(data[0].id).toBe("ep_1");
    expect(data[0].syncStatus).toBe("ok");
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/embed-profiles");
    expect(options?.method).toBe("GET");
  });

  it("createLibraryEmbedProfile posts profile payload", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, profile: { id: "ep_1" } }));
    globalThis.fetch = fetchMock as typeof fetch;

    await createLibraryEmbedProfile({
      name: "电场仿真",
      scriptUrl: "https://field.infinitas.fun/embed/embed.js",
      viewerPath: "https://field.infinitas.fun/embed/viewer.html",
      constructorName: "ElectricFieldApp",
      assetUrlOptionKey: "sceneUrl",
      matchExtensions: ["json"],
      defaultOptions: { mode: "view" },
      enabled: true,
    });

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/embed-profiles");
    expect(options?.method).toBe("POST");
    const body = JSON.parse(String(options?.body || "{}"));
    expect(body.name).toBe("电场仿真");
    expect(body.scriptUrl).toBe("https://field.infinitas.fun/embed/embed.js");
    expect(body.assetUrlOptionKey).toBe("sceneUrl");
    expect(body.matchExtensions).toEqual(["json"]);
  });

  it("deleteLibraryEmbedProfile uses delete endpoint", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    globalThis.fetch = fetchMock as typeof fetch;

    await deleteLibraryEmbedProfile("ep_1");
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/embed-profiles/ep_1");
    expect(options?.method).toBe("DELETE");
  });

  it("syncLibraryEmbedProfile posts sync endpoint", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, profile: { id: "ep_1" } }));
    globalThis.fetch = fetchMock as typeof fetch;

    await syncLibraryEmbedProfile("ep_1");
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/embed-profiles/ep_1/sync");
    expect(options?.method).toBe("POST");
  });

  it("updateLibraryAsset sends displayName patch", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, asset: { id: "a_1" } }));
    globalThis.fetch = fetchMock as typeof fetch;

    await updateLibraryAsset("a_1", { displayName: "重命名后的标题" });

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/assets/a_1");
    expect(options?.method).toBe("PUT");
    const body = JSON.parse(String(options?.body || "{}"));
    expect(body.displayName).toBe("重命名后的标题");
  });

  it("updateLibraryAsset sends openMode patch", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, asset: { id: "a_2" } }));
    globalThis.fetch = fetchMock as typeof fetch;

    await updateLibraryAsset("a_2", { openMode: "embed" });

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/assets/a_2");
    expect(options?.method).toBe("PUT");
    const body = JSON.parse(String(options?.body || "{}"));
    expect(body.openMode).toBe("embed");
    expect("displayName" in body).toBe(false);
  });

  it("updateLibraryAsset sends folder/embed profile/embed options patch", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, asset: { id: "a_3" } }));
    globalThis.fetch = fetchMock as typeof fetch;

    await updateLibraryAsset("a_3", {
      folderId: "f_target",
      embedProfileId: "ep_2",
      embedOptions: { mode: "view", autoplay: true },
    } as any);

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/assets/a_3");
    expect(options?.method).toBe("PUT");
    const body = JSON.parse(String(options?.body || "{}"));
    expect(body.folderId).toBe("f_target");
    expect(body.embedProfileId).toBe("ep_2");
    expect(body.embedOptions).toEqual({ mode: "view", autoplay: true });
  });

  it("updateLibraryFolder sends name/category patch", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, folder: { id: "f_2" } }));
    globalThis.fetch = fetchMock as typeof fetch;

    await updateLibraryFolder("f_2", { name: "力学资料", categoryId: "mechanics" } as any);

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/folders/f_2");
    expect(options?.method).toBe("PUT");
    const body = JSON.parse(String(options?.body || "{}"));
    expect(body.name).toBe("力学资料");
    expect(body.categoryId).toBe("mechanics");
  });

  it("deleteLibraryAsset calls delete endpoint", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    globalThis.fetch = fetchMock as typeof fetch;

    await deleteLibraryAsset("a_99");
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/assets/a_99");
    expect(options?.method).toBe("DELETE");
  });

  it("deleteLibraryAssetPermanently calls hard-delete endpoint", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    globalThis.fetch = fetchMock as typeof fetch;

    await deleteLibraryAssetPermanently("a_88");
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/assets/a_88/permanent");
    expect(options?.method).toBe("DELETE");
  });

  it("listLibraryDeletedAssets requests deleted list endpoint", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ assets: [{ id: "a_del", deleted: true }] }));
    globalThis.fetch = fetchMock as typeof fetch;

    const data = await listLibraryDeletedAssets("f_1");
    expect(data.assets.length).toBe(1);
    expect(data.assets[0].id).toBe("a_del");

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/deleted-assets?folderId=f_1");
    expect(options?.method).toBe("GET");
  });

  it("restoreLibraryAsset posts restore endpoint", async () => {
    sessionStorage.setItem("pa_admin_token", "token-lib-1");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, asset: { id: "a_del", deleted: false } }));
    globalThis.fetch = fetchMock as typeof fetch;

    await restoreLibraryAsset("a_del");

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit?];
    expect(url).toBe("/api/library/assets/a_del/restore");
    expect(options?.method).toBe("POST");
  });
});
