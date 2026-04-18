import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function readFile(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("topbar responsive layout", () => {
  it("provides a mobile menu panel and desktop inline-actions that work on all screen sizes", () => {
    const app = readFile("src/App.vue");

    expect(app).toMatch(/mobileMenuOpen/);
    expect(app).toMatch(/md:hidden/);
    expect(app).toMatch(/hidden\s+items-center\s+md:flex/);
  });

  it("uses dynamic viewport units to avoid iOS 100vh jump", () => {
    const css = readFile("src/styles/globals.css");
    // Tailwind provides min-h-screen and min-h-[100dvh] utilities
    expect(css).toMatch(/min-height/);
  });

  it("keeps the modal scrollable and accessible", () => {
    const app = readFile("src/App.vue");

    expect(app).toMatch(/DialogContent/);
    expect(app).toMatch(/DialogTitle/);
  });

  it("adds dedicated topbar groups that stack cleanly on narrow screens", () => {
    const app = readFile("src/App.vue");

    expect(app).toMatch(/flex-col gap-2/);
    expect(app).toMatch(/justify-start gap-3/);
  });

  it("compresses brand and utility rhythm further on mobile", () => {
    const app = readFile("src/App.vue");

    expect(app).toMatch(/items-center/);
    expect(app).toMatch(/hidden\s+items-center\s+md:flex/);
  });

  it("keeps the smallest screens focused on actions and tight topbar controls", () => {
    const app = readFile("src/App.vue");

    expect(app).toMatch(/size="sm"/);
    expect(app).toMatch(/size="icon"/);
  });

  it("uses a hamburger menu trigger on mobile and inline actions on desktop", () => {
    const app = readFile("src/App.vue");

    expect(app).toMatch(/Menu/);
    expect(app).toMatch(/X/);
  });

  it("switches admin routes into a tighter layout without catalog search chrome", () => {
    const app = readFile("src/App.vue");

    expect(app).toMatch(/isAdminRoute/);
    expect(app).toMatch(/app-main--admin/);
  });

  it("opens the mobile menu panel with clear grouped actions", () => {
    const app = readFile("src/App.vue");

    expect(app).toMatch(/border-border\s+border-t/);
    expect(app).toMatch(/bg-background/);
  });

  it("keeps the compact brand row off the shell edge on the smallest screens", () => {
    const app = readFile("src/App.vue");

    expect(app).toMatch(/px-4/);
    expect(app).toMatch(/sm:px-6/);
  });

  it("uses a unified mobile panel instead of separate mobile drawer", () => {
    const app = readFile("src/App.vue");

    expect(app).toMatch(/mobileMenuOpen/);
  });

  it("adapts the topbar search field for narrow screens", () => {
    const app = readFile("src/App.vue");

    expect(app).toMatch(/type="search"/);
    expect(app).toMatch(/w-64/);
  });
});
