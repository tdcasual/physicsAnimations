import { afterEach, describe, expect, it, vi } from "vitest";
import { loadViewerModel } from "../src/features/viewer/viewerService";

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

describe("loadViewerModel", () => {
  it("uses interactive mode by default for external links with screenshot", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/items/")) {
        return jsonResponse({
          item: {
            id: "link-1",
            type: "link",
            src: "https://example.com",
            title: "外链演示",
            thumbnail: "content/thumbnails/link-1.png",
          },
        });
      }
      return new Response("not_found", { status: 404 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const model = await loadViewerModel({ id: "link-1" });
    expect(model.status).toBe("ready");
    if (model.status !== "ready") return;

    expect(model.target).toBe("https://example.com");
    expect(model.showHint).toBe(true);
    expect(model.showModeToggle).toBe(true);
    expect(model.screenshotModeDefault).toBe(false);
    expect(model.modeButtonText).toBe("仅截图");
  });

  it("falls back to builtin item when item detail is unavailable", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/items/")) {
        return new Response("not_found", { status: 404 });
      }
      if (url.includes("/api/health")) {
        return new Response("not_found", { status: 404 });
      }
      if (url.includes("/animations.json")) {
        return jsonResponse({
          mechanics: {
            title: "力学",
            items: [
              {
                file: "mechanics/demo.html",
                title: "内置演示",
                description: "",
                thumbnail: "animations/thumbnails/mechanics/demo.png",
              },
            ],
          },
        });
      }
      return new Response("not_found", { status: 404 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const model = await loadViewerModel({ id: "mechanics/demo.html" });
    expect(model.status).toBe("ready");
    if (model.status !== "ready") return;
    expect(model.target).toBe("animations/mechanics/demo.html");
    expect(model.title).toBe("内置演示");
  });

  it("returns invalid state for unsafe target", async () => {
    const model = await loadViewerModel({ src: "javascript:alert(1)" });
    expect(model.status).toBe("error");
    if (model.status !== "error") return;
    expect(model.code).toBe("invalid_target");
  });
});
