import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("catalog theme mobile", () => {
  it("uses a responsive grid that adapts to screen size", () => {
    const source = read("src/views/CatalogView.vue");
    expect(source).toMatch(/grid-cols-2/);
    expect(source).toMatch(/sm:grid-cols-3/);
    expect(source).toMatch(/lg:grid-cols-5/);
  });

  it("provides a sticky filter bar on mobile", () => {
    const source = read("src/views/CatalogView.vue");
    expect(source).toMatch(/sticky/);
    expect(source).toMatch(/z-40/);
  });

  it("uses skeleton loading state while fetching data", () => {
    const source = read("src/views/CatalogView.vue");
    expect(source).toMatch(/Skeleton/);
    expect(source).toMatch(/loading/);
  });
});
