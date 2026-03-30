import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("catalog theme semantics", () => {
  it("uses CSS variables for theming instead of hard-coded values", () => {
    const source = read("src/views/CatalogView.vue");
    const styleBlock = source.split("<style scoped>")[1] ?? "";

    // 不应该使用硬编码的十六进制颜色
    expect(styleBlock).not.toMatch(/#ffffff/i);
    expect(styleBlock).not.toMatch(/#f8fafc/i);
    expect(styleBlock).not.toMatch(/#dbeafe/i);
    expect(styleBlock).not.toMatch(/#d1d5db/i);
    
    // 应该使用 CSS 变量
    expect(styleBlock).toMatch(/var\(--surface/);
    expect(styleBlock).toMatch(/var\(--border/);
    expect(styleBlock).toMatch(/var\(--text-/);
    expect(styleBlock).toMatch(/var\(--primary/);
  });

  it("allows catalog card text to wrap on mobile", () => {
    const source = read("src/views/CatalogView.vue");
    const styleBlock = source.split("<style scoped>")[1] ?? "";

    // 检查文本换行处理
    expect(styleBlock).toMatch(/line-height:/);
    expect(styleBlock).toMatch(/overflow-wrap|word-break|line-clamp/);
  });

  it("allows catalog card description to wrap on mobile", () => {
    const source = read("src/views/CatalogView.vue");
    const styleBlock = source.split("<style scoped>")[1] ?? "";

    // 检查描述文本换行
    expect(styleBlock).toMatch(/-webkit-line-clamp/);
    expect(styleBlock).toMatch(/overflow:\s*hidden/);
  });
});
