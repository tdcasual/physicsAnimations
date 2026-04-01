import { describe, expect, it } from "vitest";
import { toAsset, toEmbedProfile, toFolder } from "../src/features/library/libraryApiMappers";

describe("libraryApiMappers robustness", () => {
  it("toFolder should not leak NaN for numeric fields and should normalize parentId to string/null", () => {
    const folder = toFolder({
      id: "f_1",
      name: "Folder",
      order: "not-a-number",
      assetCount: "oops",
      parentId: 123,
    } as any);

    expect(folder.order).toBe(0);
    expect(folder.assetCount).toBe(0);
    expect(folder.parentId).toBe("123");
  });

  it("toAsset should not leak NaN for fileSize", () => {
    const asset = toAsset({
      id: "a_1",
      folderId: "f_1",
      fileSize: "not-a-number",
      openMode: "embed",
    } as any);

    expect(asset.fileSize).toBe(0);
  });

  it("toAsset should reject payloads without openMode under strict contract", () => {
    expect(() =>
      toAsset({
        id: "a_legacy",
        folderId: "f_1",
      } as any),
    ).toThrow("invalid_open_mode");
  });

  it("toAsset should reject payloads with unsupported openMode", () => {
    expect(() =>
      toAsset({
        id: "a_bad_mode",
        folderId: "f_1",
        openMode: "preview",
      } as any),
    ).toThrow("invalid_open_mode");
  });

  it("toEmbedProfile should not expose deprecated syncMode field", () => {
    const profile = toEmbedProfile({
      id: "ep_1",
      name: "Embed",
      scriptUrl: "https://field.infinitas.fun/embed/embed.js",
      syncMode: "local_mirror",
    } as any);

    expect("syncMode" in profile).toBe(false);
  });
});
