import { describe, expect, it } from "vitest";
import { toAsset, toEmbedProfile, toFolder } from "../src/features/library/libraryApiMappers";

describe("toFolder edge cases", () => {
  it("coerces all fields to strings", () => {
    const folder = toFolder({ id: 123, name: "", order: "abc", assetCount: undefined });
    expect(folder.id).toBe("123");
    expect(folder.name).toBe("");
    expect(folder.order).toBe(0);
    expect(folder.assetCount).toBe(0);
  });

  it("preserves image cover type", () => {
    expect(toFolder({ coverType: "image" }).coverType).toBe("image");
  });

  it("defaults to blank cover type", () => {
    expect(toFolder({}).coverType).toBe("blank");
    expect(toFolder({ coverType: "video" }).coverType).toBe("blank");
  });

  it("handles null parentId", () => {
    expect(toFolder({ parentId: null }).parentId).toBeNull();
  });

  it("handles undefined parentId", () => {
    expect(toFolder({}).parentId).toBeNull();
  });
});

describe("toAsset edge cases", () => {
  it("defaults openMode to embed for invalid values", () => {
    expect(() => toAsset({ openMode: "invalid" })).toThrow("invalid_open_mode");
  });

  it("marks deleted asset", () => {
    const asset = toAsset({ deleted: true, deletedAt: "2024-01-01", openMode: "embed" });
    expect(asset.deleted).toBe(true);
    expect(asset.deletedAt).toBe("2024-01-01");
  });

  it("clears deletedAt when not deleted", () => {
    const asset = toAsset({ deleted: false, deletedAt: "2024-01-01", openMode: "download" });
    expect(asset.deleted).toBe(false);
    expect(asset.deletedAt).toBe("");
  });

  it("defaults status to ready", () => {
    expect(toAsset({ openMode: "embed" }).status).toBe("ready");
  });

  it("sets failed status explicitly", () => {
    expect(toAsset({ status: "failed", openMode: "download" }).status).toBe("failed");
  });
});

describe("toEmbedProfile edge cases", () => {
  it("defaults all string fields", () => {
    const profile = toEmbedProfile({});
    expect(profile.id).toBe("");
    expect(profile.name).toBe("");
    expect(profile.scriptUrl).toBe("");
    expect(profile.fallbackScriptUrl).toBe("");
    expect(profile.viewerPath).toBe("");
    expect(profile.remoteScriptUrl).toBe("");
    expect(profile.remoteViewerPath).toBe("");
    expect(profile.syncStatus).toBe("pending");
    expect(profile.syncMessage).toBe("");
    expect(profile.lastSyncAt).toBe("");
    expect(profile.constructorName).toBe("ElectricFieldApp");
    expect(profile.assetUrlOptionKey).toBe("sceneUrl");
    expect(profile.activeReleaseId).toBe("");
  });

  it("uses scriptUrl fallback for remoteScriptUrl", () => {
    const profile = toEmbedProfile({ scriptUrl: "https://a.com" });
    expect(profile.remoteScriptUrl).toBe("https://a.com");
    expect(profile.remoteViewerPath).toBe("");
  });

  it("uses viewerPath fallback for remoteViewerPath", () => {
    const profile = toEmbedProfile({ viewerPath: "/v" });
    expect(profile.remoteViewerPath).toBe("/v");
  });

  it("filters empty matchExtensions", () => {
    const profile = toEmbedProfile({ matchExtensions: ["json", "", "  ", "html"] });
    expect(profile.matchExtensions).toEqual(["json", "html"]);
  });

  it("defaults matchExtensions to empty array", () => {
    expect(toEmbedProfile({}).matchExtensions).toEqual([]);
  });

  it("parses syncOptions with partial fields", () => {
    const profile = toEmbedProfile({
      syncOptions: { maxFiles: 10, timeoutMs: "invalid", strictSelfCheck: true },
    });
    expect(profile.syncOptions.maxFiles).toBe(10);
    expect(profile.syncOptions.timeoutMs).toBeUndefined();
    expect(profile.syncOptions.strictSelfCheck).toBe(true);
  });

  it("parses syncCache entries", () => {
    const profile = toEmbedProfile({
      syncCache: {
        "https://a.com": { etag: '"abc"', lastModified: "Mon", contentType: "text/js", relativePath: "a.js" },
        "": { etag: "x" },
      },
    });
    expect(Object.keys(profile.syncCache)).toEqual(["https://a.com"]);
    expect(profile.syncCache["https://a.com"].etag).toBe('"abc"');
  });

  it("defaults enabled to true", () => {
    expect(toEmbedProfile({}).enabled).toBe(true);
  });

  it("allows disabling", () => {
    expect(toEmbedProfile({ enabled: false }).enabled).toBe(false);
  });

  it("filters empty releaseHistory entries", () => {
    const profile = toEmbedProfile({ releaseHistory: ["r1", "", "r2"] });
    expect(profile.releaseHistory).toEqual(["r1", "r2"]);
  });
});
