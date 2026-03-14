import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getCatalogHashFallbackSelector } from "../src/features/catalog/catalogHashTarget";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog hash scroll recovery", () => {
  it("maps missing curated anchors back to the always-visible all-content section", () => {
    expect(getCatalogHashFallbackSelector("#catalog-library")).toBe("#catalog-all");
    expect(getCatalogHashFallbackSelector("#catalog-current")).toBe("#catalog-all");
    expect(getCatalogHashFallbackSelector("#catalog-all")).toBe("");
    expect(getCatalogHashFallbackSelector("#other")).toBe("");
  });

  it("reapplies hash anchor scrolling after async catalog load completes and keeps a fallback for missing curated sections", () => {
    const source = read("src/views/CatalogView.vue");

    expect(source).toMatch(/nextTick/);
    expect(source).toMatch(/useRoute/);
    expect(source).toMatch(/route\.hash/);
    expect(source).toMatch(/scrollIntoView/);
    expect(source).toMatch(/watch\(/);
    expect(source).toMatch(/getCatalogHashFallbackSelector/);
  });
});
