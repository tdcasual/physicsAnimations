import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog anchor offsets", () => {
  it("adds scroll margin to anchored home sections so sticky topbar does not cover headings", () => {
    const viewSource = read("src/views/CatalogView.vue");
    const cssSource = read("src/views/CatalogView.css");

    expect(viewSource).toMatch(/id="catalog-current"/);
    expect(viewSource).toMatch(/id="catalog-library"/);
    expect(viewSource).toMatch(/id="catalog-all"/);
    expect(cssSource).toMatch(/\.catalog-section\[id\]\s*\{[\s\S]*scroll-margin-top:\s*calc\(/);
    expect(cssSource).toMatch(/scroll-margin-top:\s*calc\([\s\S]*var\(--app-topbar-height,\s*0px\)/);
    expect(cssSource).toMatch(/scroll-margin-top:\s*calc\([\s\S]*env\(safe-area-inset-top,\s*0px\)/);
  });
});
