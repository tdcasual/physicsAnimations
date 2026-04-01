import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("catalog view maintainability budget", () => {
  it("keeps CatalogView below 340 lines and extracts state orchestration", () => {
    const viewPath = path.resolve(process.cwd(), "src/views/CatalogView.vue");
    const viewSource = fs.readFileSync(viewPath, "utf8");
    const viewLines = viewSource.split("\n").length;

    expect(viewLines).toBeLessThan(340);
    expect(viewSource).toMatch(/useCatalogViewState/);
  });
});
