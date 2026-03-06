import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog navigation homepage layout", () => {
  it("adds a light hero with search and primary quick actions", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/class="catalog-hero"/);
    expect(source).toMatch(/class="catalog-hero-search"/);
    expect(source).toMatch(/继续浏览|浏览资源库/);
  });

  it("introduces a quick access section for common categories and shortcuts", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/class="catalog-quick-access"/);
    expect(source).toMatch(/常用分类|快捷入口/);
  });

  it("splits the homepage into curated content sections before the main grid", () => {
    const source = readFile("src/views/CatalogView.vue");

    expect(source).toMatch(/class="catalog-section"/);
    expect(source).toMatch(/推荐演示|资源库精选|当前分类/);
  });
});
