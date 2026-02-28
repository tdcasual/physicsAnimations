import { describe, expect, it } from "vitest";
import type { CatalogItem } from "../src/features/catalog/types";
import { getCatalogItemHref, normalizePublicUrl } from "../src/features/catalog/catalogLink";

describe("catalog link selection", () => {
  it("prefers viewer route for external link items when href is provided", () => {
    const item: CatalogItem = {
      id: "link-1",
      type: "link",
      categoryId: "other",
      title: "外链",
      description: "",
      href: "/viewer/link-1",
      src: "https://example.com/link-1",
      thumbnail: "",
      order: 0,
    };

    expect(getCatalogItemHref(item)).toBe("/viewer/link-1");
  });

  it("prefers viewer route for builtin items when href is provided", () => {
    const item: CatalogItem = {
      id: "builtin-1",
      type: "builtin",
      categoryId: "other",
      title: "内置",
      description: "",
      href: "/viewer/builtin-1",
      src: "animations/builtin-1.html",
      thumbnail: "",
      order: 0,
    };

    expect(getCatalogItemHref(item)).toBe("/viewer/builtin-1");
  });

  it("falls back to original source when viewer href is missing", () => {
    const item: CatalogItem = {
      id: "upload-1",
      type: "upload",
      categoryId: "other",
      title: "上传",
      description: "",
      href: "",
      src: "uploads/upload-1.html",
      thumbnail: "",
      order: 0,
    };

    expect(getCatalogItemHref(item)).toBe("/uploads/upload-1.html");
  });

  it("normalizes empty value to placeholder", () => {
    expect(normalizePublicUrl("")).toBe("#");
  });
});
