import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("topbar responsive layout", () => {
  it("defines a mobile breakpoint that collapses utility controls into a compact disclosure panel", () => {
    const app = readFile("src/App.vue");
    const css = readFile("src/styles.css");

    expect(app).toMatch(/topbar-mobile-toggle/);
    expect(app).toMatch(/topbar-mobile-utility-panel/);
    expect(app).toMatch(/topbar-environment-shell/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)/);
    expect(css).toMatch(/\.topbar-mobile-toggle\s*\{[\s\S]*display:\s*none\s*!important/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-mobile-toggle\s*\{[\s\S]*display:\s*inline-flex\s*!important/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-environment-shell\s*\{[\s\S]*display:\s*none/);
    expect(css).toMatch(/\.topbar-mobile-utility-panel\s*\{[\s\S]*opacity:/);
  });

  it("uses dynamic viewport units to avoid iOS 100vh jump", () => {
    const css = readFile("src/styles.css");
    expect(css).toMatch(/\.app-shell\s*\{[\s\S]*min-height:\s*100vh/);
    expect(css).toMatch(/\.app-shell\s*\{[\s\S]*min-height:\s*100dvh/);
  });

  it("reserves safe-area inset padding for notch devices", () => {
    const css = readFile("src/styles.css");
    expect(css).toMatch(/\.topbar\s*\{[\s\S]*padding-top:\s*env\(safe-area-inset-top,\s*0px\)/);
    expect(css).toMatch(/\.topbar\s*\{[\s\S]*padding-left:\s*env\(safe-area-inset-left,\s*0px\)/);
    expect(css).toMatch(/\.topbar\s*\{[\s\S]*padding-right:\s*env\(safe-area-inset-right,\s*0px\)/);
  });

  it("keeps modal card scrollable within dynamic viewport when mobile keyboard is open", () => {
    const css = readFile("src/styles.css");
    expect(css).toMatch(/\.modal-card\s*\{[\s\S]*max-height:\s*calc\(100dvh\s*-\s*env\(safe-area-inset-top,\s*0px\)\s*-\s*env\(safe-area-inset-bottom,\s*0px\)\s*-\s*28px\)/);
    expect(css).toMatch(/\.modal-card\s*\{[\s\S]*overflow:\s*auto/);
    expect(css).toMatch(/\.modal-card\s*\{[\s\S]*-webkit-overflow-scrolling:\s*touch/);
  });

  it("adds dedicated topbar groups that stack cleanly on narrow screens", () => {
    const css = readFile("src/styles.css");
    expect(css).toMatch(/\.brand-copy\s*\{[\s\S]*display:\s*grid/);
    expect(css).toMatch(/\.topbar-primary-actions\s*\{[\s\S]*display:\s*flex/);
    expect(css).toMatch(/\.topbar-utility-actions\s*\{[\s\S]*display:\s*flex/);
    expect(css).toMatch(/\.topbar-environment-shell\s*\{[\s\S]*display:\s*flex/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-actions\s*\{[\s\S]*width:\s*100%/);
  });
});
