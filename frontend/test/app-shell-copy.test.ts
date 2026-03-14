import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("app shell copy", () => {
  it("does not display migration-in-progress wording in brand subtitle", () => {
    const source = readFile("src/App.vue");

    expect(source.includes("迁移中")).toBe(false);
  });

  it("introduces a short navigation-oriented brand subtitle", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/更快找到课堂演示与资源/);
  });

  it("provides a direct catalog entry in the public shell", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/to="\/"/);
    expect(source).toMatch(/返回目录|浏览首页/);
  });

  it("uses richer topbar grouping classes for brand and action hierarchy", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/class="brand-copy"/);
    expect(source).toMatch(/class="topbar-primary-actions"/);
    expect(source).toMatch(/class="topbar-utility-actions"/);
    expect(source).toMatch(/class="topbar-environment-shell"/);
  });

  it("frames utility controls as environment settings instead of peer navigation", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/环境偏好/);
    expect(source).toMatch(/昼夜主题/);
    expect(source).not.toMatch(/>\s*界面\s*</);
  });
});
