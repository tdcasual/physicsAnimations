import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function readFile(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("app shell copy", () => {
  it("uses a compact shared brand mark without the old teaching-atlas framing", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/演示工坊/);
    expect(source).not.toMatch(/我的演示工坊/);
    expect(source).not.toMatch(/我的学科演示集/);
    expect(source).not.toMatch(/教学实验图谱/);
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
    expect(source).toMatch(/演示工坊/);
  });

  it("uses a mobile menu panel and desktop inline actions for compact brand and action hierarchy", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/mobileMenuOpen/);
    expect(source).toMatch(/md:hidden/);
    expect(source).toMatch(/hidden md:flex/);
  });

  it("frames utility controls as preference settings inside the mobile panel", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/Sun/);
    expect(source).toMatch(/Moon/);
    expect(source).toMatch(/toggleTheme/);
    expect(source).toMatch(/课堂模式/);
  });

  it("hides the redundant admin shortcut once the user is already inside admin routes", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/const showAdminShortcut = computed/);
    expect(source).toMatch(/v-if="showAdminShortcut"/);
  });

  it("places a global search box in the topbar next to the brand", () => {
    const source = readFile("src/App.vue");

    expect(source).toMatch(/type="search"/);
    expect(source).toMatch(/useCatalogSearch/);
  });
});
