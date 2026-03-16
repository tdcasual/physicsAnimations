import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("app shell copy", () => {
  it("uses a compact shared brand mark without the old teaching-atlas framing", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/class="brand-lockup"/);
    expect(source).toMatch(/class="brand-mark"/);
    expect(source).toMatch(/科学演示集/);
    expect(source).not.toMatch(/我的科学演示集/);
    expect(source).not.toMatch(/我的学科演示集/);
    expect(source).not.toMatch(/教学实验图谱/);
    expect(source).not.toMatch(/brand-meta/);
  });

  it("does not display migration-in-progress wording in brand subtitle", () => {
    const source = readFile("src/App.vue");

    expect(source.includes("迁移中")).toBe(false);
  });

  it("drops the old navigation-oriented brand subtitle from the shared shell", () => {
    const source = readFile("src/App.vue");

    expect(source).not.toMatch(/更快找到课堂演示与资源/);
  });

  it("provides a direct catalog entry in the public shell", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/to="\/"/);
    expect(source).toMatch(/topbar-home-link/);
    expect(source).toMatch(/aria-label="浏览首页"/);
    expect(source).toMatch(/class="topbar-home-label"/);
    expect(source).toMatch(/>\s*首页\s*</);
  });

  it("uses a leaner topbar grouping model for compact brand and action hierarchy", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/class="brand-lockup"/);
    expect(source).toMatch(/class="brand-mark"/);
    expect(source).toMatch(/class="topbar-primary-actions"/);
    expect(source).toMatch(/class="topbar-action-cluster"/);
    expect(source).toMatch(/class="topbar-environment-shell"/);
  });

  it("frames utility controls as environment settings instead of peer navigation", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/环境偏好/);
    expect(source).toMatch(/昼夜主题/);
    expect(source).not.toMatch(/>\s*界面\s*</);
  });

  it("adds a small environment copy block so settings read as secondary context", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/topbar-environment-copy/);
    expect(source).toMatch(/topbar-utility-note/);
    expect(source).toMatch(/放大与主题仅影响当前设备/);
  });

  it("hides the redundant admin shortcut once the user is already inside admin routes", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/const showAdminShortcut = computed/);
    expect(source).toMatch(/v-if="showAdminShortcut"/);
    expect(source).toMatch(/topbar-admin-link/);
    expect(source).toMatch(/topbar-mobile-admin-link/);
  });

  it("binds route-aware topbar tone classes so browsing and work modes read faster", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/topbar--catalog/);
    expect(source).toMatch(/topbar--viewer/);
    expect(source).toMatch(/topbar--admin/);
    expect(source).toMatch(/topbar--library/);
  });
});
