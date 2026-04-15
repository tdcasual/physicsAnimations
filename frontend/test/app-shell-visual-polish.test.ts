import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("app shell visual polish", () => {
  it("uses Tailwind CSS for the new design system", () => {
    const css = read("src/styles/globals.css");

    expect(css).toMatch(/@import "tailwindcss"/);
    expect(css).toMatch(/--background:/);
    expect(css).toMatch(/--foreground:/);
    expect(css).toMatch(/--primary:/);
  });

  it("defines light and dark theme tokens", () => {
    const css = read("src/styles/globals.css");

    expect(css).toMatch(/@custom-variant dark/);
    expect(css).toMatch(/\[data-theme="dark"\]/);
  });

  it("renders a modern glassmorphism topbar with backdrop blur", () => {
    const app = read("src/App.vue");

    expect(app).toMatch(/backdrop-blur/);
    expect(app).toMatch(/bg-background\/80/);
    expect(app).toMatch(/border-b/);
  });

  it("uses rounded-full buttons and capsule-shaped UI elements", () => {
    const app = read("src/App.vue");

    expect(app).toMatch(/rounded-full/);
  });

  it("provides a dedicated mobile menu panel", () => {
    const app = read("src/App.vue");

    expect(app).toMatch(/mobileMenuOpen/);
    expect(app).toMatch(/md:hidden/);
  });

  it("uses elegant serif font for brand", () => {
    const app = read("src/App.vue");

    expect(app).toMatch(/font-serif/);
  });
});
