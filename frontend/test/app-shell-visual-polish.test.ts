import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("app shell visual polish", () => {
  it("extracts topbar polish into a dedicated shell stylesheet", () => {
    const app = read("src/App.vue");

    expect(app).toMatch(/AppShell\.css/);
  });

  it("defines the shared shell token palette and compact topbar brand lockup", () => {
    const app = read("src/App.vue");
    const css = read("src/styles.css");

    expect(app).toMatch(/brand-lockup/);
    expect(app).toMatch(/brand-mark/);
    expect(css).toMatch(/--paper:/);
    expect(css).toMatch(/--ink:/);
    expect(css).toMatch(/--accent-copper:/);
  });

  it("adds subtle topbar highlight and button hover feedback", () => {
    const css = read("src/AppShell.css");

    expect(css).toMatch(/topbar::after/);
    expect(css).toMatch(/topbar[\s\S]*box-shadow:/);
    expect(css).toMatch(/btn:hover/);
  });

  it("gives environment settings a dedicated framed utility surface", () => {
    const app = read("src/App.vue");
    const css = read("src/AppShell.css");

    expect(app).toMatch(/topbar-environment-shell/);
    expect(css).toMatch(/topbar-environment-shell/);
    expect(css).toMatch(/topbar-utility-label/);
  });

  it("adds dedicated compact-shell polish for the brand rail and route-aware shell tone hooks", () => {
    const app = read("src/App.vue");
    const shellCss = read("src/AppShell.css");
    const baseCss = read("src/styles.css");

    expect(app).toMatch(/brand-lockup/);
    expect(app).toMatch(/brand-mark/);
    expect(shellCss).toMatch(/topbar-shell-panel/);
    expect(shellCss).toMatch(/brand-link::before/);
    expect(shellCss).toMatch(/topbar--viewer/);
    expect(baseCss).toMatch(/brand-lockup/);
  });

  it("adds compact mobile polish for the home link and utility drawer framing", () => {
    const app = read("src/App.vue");
    const shellCss = read("src/AppShell.css");

    expect(app).toMatch(/topbar-home-link/);
    expect(shellCss).toMatch(/topbar-home-link/);
    expect(shellCss).toMatch(/topbar-mobile-utility-panel/);
  });

  it("protects the compact brand lockup from overflow on narrow screens", () => {
    const css = read("src/styles.css");

    expect(css).toMatch(/\.brand-link\s*\{[\s\S]*min-width:\s*0/);
    expect(css).toMatch(/\.brand-lockup\s*\{[\s\S]*min-width:\s*0/);
    expect(css).toMatch(/\.brand-mark\s*\{[\s\S]*white-space:\s*nowrap/);
  });
});
