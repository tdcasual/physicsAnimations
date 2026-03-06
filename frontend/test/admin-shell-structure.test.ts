import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin shell structure", () => {
  it("organizes admin modules into grouped workspace navigation", () => {
    const source = readFile("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/admin-nav-group/);
    expect(source).toMatch(/内容管理|资源结构|系统设置/);
  });

  it("adds current workspace context and a controlled mobile workspace menu", () => {
    const source = readFile("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/mobileNavOpen/);
    expect(source).toMatch(/class="admin-mobile-nav-trigger"/);
    expect(source).toMatch(/class="admin-nav-shell"/);
    expect(source).toMatch(/class="admin-context-card"/);
    expect(source).toMatch(/工作区菜单/);
  });
});
