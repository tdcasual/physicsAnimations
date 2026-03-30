import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog view maintainability budget", () => {
  it("extracts state orchestration into composables", () => {
    const source = read("src/views/CatalogView.vue");

    expect(source).toMatch(/useCatalogViewState/);
    expect(source).not.toMatch(/const loading = ref/);
    expect(source).not.toMatch(/const items = ref/);
  });

  it("imports from features directory", () => {
    const source = read("src/views/CatalogView.vue");

    expect(source).toMatch(/features\/catalog/);
  });
});
