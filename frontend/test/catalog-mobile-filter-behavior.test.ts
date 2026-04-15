import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("catalog mobile filter behavior", () => {
  it("provides sticky filter tabs on mobile", () => {
    const source = read("src/views/CatalogView.vue");

    expect(source).toMatch(/sticky top-16/);
    expect(source).toMatch(/z-40/);
  });

  it("uses horizontal scrollable filter tabs", () => {
    const source = read("src/views/catalog/components/FilterTabs.vue");

    expect(source).toMatch(/overflow-x-auto/);
    expect(source).toMatch(/scrollbar-hide/);
  });
});
