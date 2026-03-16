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
    expect(css).toMatch(/\.brand-lockup\s*\{[\s\S]*display:\s*grid/);
    expect(css).toMatch(/\.topbar-primary-actions\s*\{[\s\S]*display:\s*flex/);
    expect(css).toMatch(/\.topbar-action-cluster\s*\{[\s\S]*display:\s*grid/);
    expect(css).toMatch(/\.topbar-environment-shell\s*\{[\s\S]*display:\s*flex/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-actions\s*\{[\s\S]*width:\s*100%/);
  });

  it("compresses brand and utility rhythm further on mobile instead of only wrapping blocks", () => {
    const css = readFile("src/styles.css");

    expect(css).toMatch(/\.brand-link\s*\{[\s\S]*align-items:\s*center/);
    expect(css).toMatch(/\.brand-mark\s*\{[\s\S]*white-space:\s*nowrap/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-shell-panel\s*\{[\s\S]*padding:/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-lead\s*\{[\s\S]*align-items:\s*center/);
  });

  it("keeps the smallest screens focused on actions and tight topbar controls", () => {
    const css = readFile("src/styles.css");
    const app = readFile("src/App.vue");

    expect(app).not.toMatch(/topbar-route-chip/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar\s+\.btn\s*\{[\s\S]*min-height:\s*40px/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar\s+\.btn\s*\{[\s\S]*padding:\s*7px\s*12px/);
  });

  it("reflows the mobile topbar into a tighter brand row and hides low-value support copy", () => {
    const css = readFile("src/styles.css");

    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-lead\s*\{[\s\S]*display:\s*grid/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-lead\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.brand-mark\s*\{[\s\S]*font-size:/);
  });

  it("trims mobile viewer topbar density by hiding duplicate home access and moving admin entry behind the more panel", () => {
    const app = readFile("src/App.vue");
    const css = readFile("src/styles.css");

    expect(app).toMatch(/topbar-admin-link/);
    expect(app).toMatch(/topbar-mobile-admin-link/);
    expect(app).toMatch(/>\s*更多\s*</);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-admin-link\s*\{[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar--viewer\s+\.topbar-home-link\s*\{[\s\S]*display:\s*none/);
  });

  it("keeps the compact brand row off the shell edge on the smallest screens", () => {
    const css = readFile("src/styles.css");

    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-shell-panel\s*\{[\s\S]*padding:\s*4px\s*4px\s*3px/);
  });

  it("turns the mobile utility disclosure into a compact drawer with a divider instead of another loose block", () => {
    const css = readFile("src.styles.css".replace(".", "/"));
    const shellCss = readFile("src/AppShell.css");

    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-mobile-utility-panel\s*\{[\s\S]*margin-top:/);
    expect(shellCss).toMatch(/topbar-mobile-utility-panel/);
    expect(shellCss).toMatch(/border-top:/);
  });
});
