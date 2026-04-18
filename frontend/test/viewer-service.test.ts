import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadViewerModel } from "../src/features/viewer/viewerService";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  sessionStorage.clear();
});

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
  it("returns error for missing id", async () => {
    const model = await loadViewerModel({});
    expect(model.status).toBe("error");
    if (model.status === "error") {
      expect(model.code).toBe("missing_params");
    }
  });

  it("returns error when item not found", async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ item: null }, 404));
    const model = await loadViewerModel({ id: "missing" });
    expect(model.status).toBe("error");
    if (model.status === "error") {
      expect(model.code).toBe("not_found");
    }
  });

  it("returns error for unsafe target", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ item: { id: "bad", src: "javascript:alert(1)" } }),
    );
    const model = await loadViewerModel({ id: "bad" });
    expect(model.status).toBe("error");
    if (model.status === "error") {
      expect(model.code).toBe("invalid_target");
    }
  });

  it("returns error for protocol-relative URL", async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ item: { id: "bad", src: "//evil.com" } }));
    const model = await loadViewerModel({ id: "bad" });
    expect(model.status).toBe("error");
    if (model.status === "error") {
      expect(model.code).toBe("invalid_target");
    }
  });

  it("returns ready model for local path", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ item: { id: "demo", src: "/content/demos/mech.html", title: "力学" } }),
    );
    const model = await loadViewerModel({ id: "demo" });
    expect(model.status).toBe("ready");
    if (model.status === "ready") {
      expect(model.title).toBe("力学");
      expect(model.target).toBe("/content/demos/mech.html");
      expect(model.openHref).toBe("/content/demos/mech.html");
      expect(model.iframeSandbox).toBe("allow-scripts");
      expect(model.deferInteractiveStart).toBe(false);
    }
  });

  it("returns ready model for external link with screenshot", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({
        item: {
          id: "link",
          src: "https://example.com",
          title: "外链",
          thumbnail: "/thumb.png",
          type: "link",
        },
      }),
    );
    const model = await loadViewerModel({ id: "link" });
    expect(model.status).toBe("ready");
    if (model.status === "ready") {
      expect(model.deferInteractiveStart).toBe(true);
      expect(model.showModeToggle).toBe(true);
      expect(model.screenshotModeDefault).toBe(true);
      expect(model.modeButtonText).toBe("进入交互");
      expect(model.showHint).toBe(true);
    }
  });

  it("uses target without leading slash as relative", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ item: { id: "demo", src: "demos/mech.html" } }),
    );
    const model = await loadViewerModel({ id: "demo" });
    expect(model.status).toBe("ready");
    if (model.status === "ready") {
      expect(model.target).toBe("/demos/mech.html");
    }
  });

  it("isolates upload content targets", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ item: { id: "up", src: "/content/uploads/file.html" } }),
    );
    const model = await loadViewerModel({ id: "up" });
    expect(model.status).toBe("ready");
    if (model.status === "ready") {
      expect(model.target).toBe("/content/isolated/uploads/file.html");
      expect(model.showHint).toBe(true);
    }
  });

  it("handles network error gracefully", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network error");
    });
    const model = await loadViewerModel({ id: "demo" });
    expect(model.status).toBe("error");
  });

  it("retries without auth after 401", async () => {
    sessionStorage.setItem("pa_admin_token", "tok-401");
    let calls = 0;
    globalThis.fetch = vi.fn(async (_input, init?: RequestInit) => {
      calls++;
      if (calls === 1 && init?.headers && (init.headers as Record<string, string>).Authorization) {
        return jsonResponse({ error: "unauthorized" }, 401);
      }
      return jsonResponse({ item: { id: "demo", src: "/demo.html" } });
    });

    const model = await loadViewerModel({ id: "demo" });
    expect(calls).toBe(2);
    expect(model.status).toBe("ready");
  });

  it("defaults title when item has no title", async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ item: { id: "demo", src: "/demo.html" } }));
    const model = await loadViewerModel({ id: "demo" });
    if (model.status === "ready") {
      expect(model.title).toBe("作品预览");
    }
  });

  it("handles screenshotUrl from thumbnail", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ item: { id: "demo", src: "/demo.html", thumbnail: "/shot.png" } }),
    );
    const model = await loadViewerModel({ id: "demo" });
    if (model.status === "ready") {
      expect(model.screenshotUrl).toBe("/shot.png");
    }
  });
});
