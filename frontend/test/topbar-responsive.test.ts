import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("topbar responsive layout", () => {
  it("defines a mobile breakpoint that allows topbar wrapping", () => {
    const css = readFile("src/styles.css");
    expect(css).toMatch(/@media\s*\(max-width:\s*480px\)/);
    expect(css).toMatch(/\.topbar-inner\s*\{[\s\S]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.actions\s*\{[\s\S]*flex-wrap:\s*wrap/);
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
});
