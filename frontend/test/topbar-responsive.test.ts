import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function readFile(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("topbar responsive layout", () => {
  it("provides a mobile more-panel and desktop inline-actions that work on all screen sizes", () => {
    const app = readFile("src/App.vue");
    const css = readFile("src/styles.css");

    expect(app).toMatch(/topbar-more-trigger/);
    expect(app).toMatch(/topbar-more-panel/);
    expect(app).toMatch(/topbar-inline-actions/);
    expect(css).toMatch(/\.topbar-more-panel\s*\{[\s\S]*max-height:\s*0/);
    expect(css).toMatch(/\.topbar-more-panel\.is-open\s*\{[\s\S]*max-height:\s*200px/);
    expect(css).toMatch(/\.topbar-more-group\s*\{[\s\S]*display:\s*grid/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)/);
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
    expect(css).toMatch(/\.topbar-more-panel\s*\{[\s\S]*display:\s*grid/);
    expect(css).toMatch(/\.topbar-more-group\s*\{[\s\S]*display:\s*grid/);
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

  it("uses a more trigger on mobile and inline actions on desktop instead of separate toggle and environment shell", () => {
    const app = readFile("src/App.vue");
    const css = readFile("src/styles.css");

    expect(app).toMatch(/topbar-more-trigger/);
    expect(app).toMatch(/topbar-inline-actions/);
    expect(app).toMatch(/topbar-admin-link/);
    expect(app).toMatch(/>\s*更多\s*</);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar--viewer\s+\.topbar-home-link\s*\{[\s\S]*display:\s*none/);
  });

  it("switches admin routes into a tighter mobile utility bar instead of keeping catalog search chrome", () => {
    const app = readFile("src/App.vue");
    const css = readFile("src/styles.css");

    expect(app).toMatch(/isAdminShellRoute/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar--admin\s+\.topbar-search-launch\s*\{[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar--admin\s+\.topbar-search-field\s*\{[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar--admin\s+\.topbar-home-link\s*\{[\s\S]*display:\s*none/);
    expect(app).not.toMatch(/topbar-more-trigger-meta/);
  });

  it("keeps the admin mobile more trigger visually centered instead of crowding the topbar corner", () => {
    const css = readFile("src/styles.css");
    const shellCss = readFile("src/AppShell.css");

    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar--admin\s+\.topbar-shell-panel\s*\{[\s\S]*padding:\s*6px\s*2px\s*5px/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar--admin\s+\.topbar-actions\s*\{[\s\S]*align-items:\s*center/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar--admin\s+\.topbar-more-trigger\.btn\s*\{[\s\S]*min-height:\s*36px[\s\S]*padding:\s*0\s*28px\s*0\s*12px[\s\S]*align-items:\s*center[\s\S]*justify-content:\s*center[\s\S]*gap:\s*0/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar--admin\s+\.topbar-more-trigger-label\s*\{[\s\S]*line-height:\s*1/);
    expect(css).toMatch(/\.topbar-more-trigger\.btn\s*\{[\s\S]*align-items:\s*center[\s\S]*justify-content:\s*center[\s\S]*gap:\s*0/);
    expect(shellCss).toMatch(/:global\(\.topbar--admin\s+\.topbar-more-trigger::after\)\s*\{[\s\S]*right:\s*10px[\s\S]*font-size:\s*10px/);
  });

  it("opens the admin mobile more panel as a roomy dropdown instead of a cramped action rail", () => {
    const css = readFile("src/styles.css");

    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar--admin\s+\.topbar-actions\s*\{[\s\S]*position:\s*relative/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar--admin\s+\.topbar-more-panel\s*\{[\s\S]*position:\s*absolute[\s\S]*right:\s*0[\s\S]*top:\s*calc\(100%\s*\+\s*8px\)[\s\S]*min-width:\s*min\(220px,\s*calc\(100vw\s*-\s*24px\)\)[\s\S]*width:\s*min\(236px,\s*calc\(100vw\s*-\s*24px\)\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar--admin\s+\.topbar-more-panel\s+\.btn\s*\{[\s\S]*justify-content:\s*flex-start[\s\S]*text-align:\s*left/);
  });

  it("keeps the compact brand row off the shell edge on the smallest screens", () => {
    const css = readFile("src/styles.css");

    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-shell-panel\s*\{[\s\S]*padding:\s*4px\s*4px\s*3px/);
  });

  it("uses a unified more-panel with border dividers instead of separate mobile drawer", () => {
    const shellCss = readFile("src/AppShell.css");

    expect(shellCss).toMatch(/topbar-more-panel/);
    expect(shellCss).toMatch(/border-top:/);
    expect(shellCss).toMatch(/topbar-more-group/);
  });

  it("adapts the topbar search field for narrow screens", () => {
    const css = readFile("src/styles.css");

    expect(css).toMatch(/\.topbar-search-field\s*\{/);
    expect(css).toMatch(/\.topbar-search\s*\{/);
    expect(css).toMatch(/\.topbar-search:focus-visible\s*\{/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-search-field\s*\{[\s\S]*max-width:\s*none/);
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.topbar-search\s*\{[\s\S]*min-height:\s*34px/);
  });
});
