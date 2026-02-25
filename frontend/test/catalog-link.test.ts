import { describe, expect, it } from "vitest";
import type { CatalogItem } from "../src/features/catalog/types";
import { getCatalogItemHref, normalizePublicUrl } from "../src/features/catalog/catalogLink";

describe("catalog link selection", () => {
  it("prefers viewer href over raw src", () => {
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

  it("falls back to src when href is missing", () => {
    const item: CatalogItem = {
      id: "builtin-1",
      type: "builtin",
      categoryId: "other",
      title: "内置",
      description: "",
      href: "",
      src: "animations/builtin-1.html",
      thumbnail: "",
      order: 0,
    };

    expect(getCatalogItemHref(item)).toBe("/animations/builtin-1.html");
  });

  it("normalizes empty value to placeholder", () => {
    expect(normalizePublicUrl("")).toBe("#");
  });
});
