import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("app shell visual polish", () => {
  it("moves route-tone and topbar interaction helpers into a dedicated app-shell module", () => {
    const app = read("src/App.vue");

    expect(app).toMatch(/features\/app\/appShellTopbar/);
  });

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

    expect(css).toMatch(/brand-link:hover/);
    expect(css).toMatch(/topbar[\s\S]*btn:hover/);
    expect(css).toMatch(/btn:hover/);
  });

  it("gives the more-panel a dedicated surface with group dividers", () => {
    const app = read("src/App.vue");
    const css = read("src/AppShell.css");
    const baseCss = read("src/styles.css");

    expect(app).toMatch(/topbar-more-panel/);
    expect(css).toMatch(/topbar-more-panel/);
    expect(baseCss).toMatch(/topbar-more-group/);
  });

  it("adds dedicated compact-shell polish for the brand rail and route-aware shell tone hooks", () => {
    const app = read("src/App.vue");
    const shellCss = read("src/AppShell.css");
    const baseCss = read("src/styles.css");

    expect(app).toMatch(/brand-lockup/);
    expect(app).toMatch(/brand-mark/);
    expect(baseCss).toMatch(/topbar-shell-panel/);
    expect(shellCss).toMatch(/brand-link::before/);
    expect(shellCss).toMatch(/topbar--viewer/);
    expect(baseCss).toMatch(/brand-lockup/);
  });

  it("adds compact mobile polish for the home link and more-panel framing", () => {
    const app = read("src/App.vue");
    const shellCss = read("src/AppShell.css");

    expect(app).toMatch(/topbar-home-link/);
    expect(shellCss).toMatch(/topbar-home-link/);
    expect(shellCss).toMatch(/topbar-more-panel/);
  });

  it("protects the compact brand lockup from overflow on narrow screens", () => {
    const css = read("src/styles.css");

    expect(css).toMatch(/\.brand-link\s*\{[\s\S]*min-width:\s*0/);
    expect(css).toMatch(/\.brand-lockup\s*\{[\s\S]*min-width:\s*0/);
    expect(css).toMatch(/\.brand-mark\s*\{[\s\S]*white-space:\s*nowrap/);
  });
});
