import { describe, expect, it } from "vitest";
import {
  buildCreateLibraryEmbedProfileBody,
  buildCreateLibraryFolderBody,
  buildUpdateLibraryAssetBody,
  buildUpdateLibraryEmbedProfileBody,
  buildUpdateLibraryFolderBody,
  buildUploadLibraryAssetFormData,
} from "../src/features/library/libraryApiPayloads";

describe("buildCreateLibraryFolderBody", () => {
  it("includes name and categoryId", () => {
    const body = buildCreateLibraryFolderBody({ name: "F1", categoryId: "mechanics" });
    expect(body).toEqual({ name: "F1", categoryId: "mechanics", coverType: "blank" });
  });

  it("defaults coverType to blank", () => {
    const body = buildCreateLibraryFolderBody({ name: "F1", categoryId: "other" });
    expect(body.coverType).toBe("blank");
  });

  it("allows image cover type", () => {
    const body = buildCreateLibraryFolderBody({ name: "F1", categoryId: "other", coverType: "image" });
    expect(body.coverType).toBe("image");
  });
});

describe("buildUpdateLibraryFolderBody", () => {
  it("includes only changed fields", () => {
    expect(buildUpdateLibraryFolderBody({ name: "New" })).toEqual({ name: "New" });
    expect(buildUpdateLibraryFolderBody({ categoryId: "optics" })).toEqual({ categoryId: "optics" });
  });

  it("returns empty when nothing changed", () => {
    expect(buildUpdateLibraryFolderBody({})).toEqual({});
  });

  it("trims string values", () => {
    expect(buildUpdateLibraryFolderBody({ name: "  spaced  " })).toEqual({ name: "spaced" });
  });
});

describe("buildUploadLibraryAssetFormData", () => {
  it("builds form data with required fields", () => {
    const file = new File(["x"], "demo.ggb");
    const form = buildUploadLibraryAssetFormData({ folderId: "f1", file, openMode: "download" });
    expect(form.get("openMode")).toBe("download");
    expect(form.get("file")).toBeInstanceOf(File);
    expect(form.get("displayName")).toBe("");
    expect(form.get("embedOptionsJson")).toBe("");
  });

  it("includes embed profile id when provided", () => {
    const file = new File(["x"], "demo.ggb");
    const form = buildUploadLibraryAssetFormData({
      folderId: "f1",
      file,
      openMode: "embed",
      embedProfileId: "ep1",
    });
    expect(form.get("embedProfileId")).toBe("ep1");
  });

  it("rejects invalid openMode", () => {
    const file = new File(["x"], "demo.ggb");
    expect(() =>
      buildUploadLibraryAssetFormData({ folderId: "f1", file, openMode: "invalid" as never }),
    ).toThrow("invalid_open_mode");
  });
});

describe("buildCreateLibraryEmbedProfileBody", () => {
  it("applies all defaults", () => {
    const body = buildCreateLibraryEmbedProfileBody({ name: "P", scriptUrl: "https://a.com" });
    expect(body.constructorName).toBe("ElectricFieldApp");
    expect(body.assetUrlOptionKey).toBe("sceneUrl");
    expect(body.matchExtensions).toEqual([]);
    expect(body.defaultOptions).toEqual({});
    expect(body.enabled).toBe(true);
  });

  it("preserves custom values", () => {
    const body = buildCreateLibraryEmbedProfileBody({
      name: "P",
      scriptUrl: "https://a.com",
      fallbackScriptUrl: "https://b.com",
      viewerPath: "/v",
      constructorName: "MyApp",
      assetUrlOptionKey: "url",
      matchExtensions: ["json"],
      defaultOptions: { mode: "view" },
      enabled: false,
    });
    expect(body.fallbackScriptUrl).toBe("https://b.com");
    expect(body.viewerPath).toBe("/v");
    expect(body.constructorName).toBe("MyApp");
    expect(body.assetUrlOptionKey).toBe("url");
    expect(body.matchExtensions).toEqual(["json"]);
    expect(body.defaultOptions).toEqual({ mode: "view" });
    expect(body.enabled).toBe(false);
  });

  it("filters invalid defaultOptions", () => {
    const body = buildCreateLibraryEmbedProfileBody({
      name: "P",
      scriptUrl: "https://a.com",
      defaultOptions: [1, 2] as never,
    });
    expect(body.defaultOptions).toEqual({});
  });
});

describe("buildUpdateLibraryEmbedProfileBody", () => {
  it("includes only changed fields", () => {
    expect(buildUpdateLibraryEmbedProfileBody({ name: "N" })).toEqual({ name: "N" });
  });

  it("ignores undefined matchExtensions", () => {
    expect(buildUpdateLibraryEmbedProfileBody({ matchExtensions: undefined as never })).toEqual({});
  });

  it("preserves matchExtensions array", () => {
    expect(buildUpdateLibraryEmbedProfileBody({ matchExtensions: ["json"] })).toEqual({
      matchExtensions: ["json"],
    });
  });

  it("filters invalid defaultOptions", () => {
    const body = buildUpdateLibraryEmbedProfileBody({ defaultOptions: [1] as never });
    expect(body.defaultOptions).toEqual({});
  });

  it("preserves valid defaultOptions", () => {
    const body = buildUpdateLibraryEmbedProfileBody({ defaultOptions: { x: 1 } });
    expect(body.defaultOptions).toEqual({ x: 1 });
  });

  it("coerces enabled to boolean", () => {
    expect(buildUpdateLibraryEmbedProfileBody({ enabled: true })).toEqual({ enabled: true });
    expect(buildUpdateLibraryEmbedProfileBody({ enabled: false })).toEqual({ enabled: false });
  });
});

describe("buildUpdateLibraryAssetBody", () => {
  it("includes only changed fields", () => {
    expect(buildUpdateLibraryAssetBody({ displayName: "D" })).toEqual({ displayName: "D" });
  });

  it("rejects invalid openMode", () => {
    expect(() => buildUpdateLibraryAssetBody({ openMode: "invalid" as never })).toThrow("invalid_open_mode");
  });

  it("accepts valid openMode", () => {
    expect(buildUpdateLibraryAssetBody({ openMode: "embed" })).toEqual({ openMode: "embed" });
  });

  it("includes folderId", () => {
    expect(buildUpdateLibraryAssetBody({ folderId: "f2" })).toEqual({ folderId: "f2" });
  });

  it("includes embedProfileId", () => {
    expect(buildUpdateLibraryAssetBody({ embedProfileId: "ep1" })).toEqual({ embedProfileId: "ep1" });
  });

  it("filters invalid embedOptions", () => {
    expect(buildUpdateLibraryAssetBody({ embedOptions: [1] as never })).toEqual({ embedOptions: {} });
  });

  it("preserves valid embedOptions", () => {
    expect(buildUpdateLibraryAssetBody({ embedOptions: { mode: "view" } })).toEqual({
      embedOptions: { mode: "view" },
    });
  });
});
