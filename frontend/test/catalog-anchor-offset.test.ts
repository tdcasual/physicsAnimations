import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog anchor offsets", () => {
  it("has sticky navigation that accounts for topbar height", () => {
    const css = read("src/views/CatalogView.vue");

    expect(css).toMatch(/position:\s*sticky/);
    expect(css).toMatch(/top:\s*64px/);
    expect(css).toMatch(/z-index:/);
  });

  it("has smooth scrolling defined in design system", () => {
    const css = read("src/styles/design-system.css");

    expect(css).toMatch(/scroll-behavior:\s*smooth/);
  });
});
