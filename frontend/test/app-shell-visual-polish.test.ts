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

  it("defines the teaching-atlas token palette and editorial topbar copy", () => {
    const app = read("src/App.vue");
    const css = read("src/styles.css");

    expect(app).toMatch(/brand-meta/);
    expect(app).toMatch(/topbar-note/);
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
});
