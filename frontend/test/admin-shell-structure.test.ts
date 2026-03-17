import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function readFile(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("admin shell structure", () => {
  it("moves grouped admin navigation config and layout styles into dedicated modules", () => {
    const source = readFile("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/features\/admin\/adminNavConfig/);
    expect(source).toMatch(/<style\s+src="\.\/AdminLayoutView\.css"><\/style>/);
  });

  it("organizes admin modules into grouped workspace navigation", () => {
    const source = [
      readFile("src/views/admin/AdminLayoutView.vue"),
      readFile("src/components/admin/AdminShellHeader.vue"),
      readFile("src/features/admin/adminNavConfig.ts"),
    ].join("\n");

    expect(source).toMatch(/admin-nav-group/);
    expect(source).toMatch(/内容管理|资源结构|系统设置/);
  });

  it("adds current workspace context and a controlled mobile workspace menu", () => {
    const source = [
      readFile("src/views/admin/AdminLayoutView.vue"),
      readFile("src/components/admin/AdminShellHeader.vue"),
      readFile("src/features/admin/adminNavConfig.ts"),
    ].join("\n");

    expect(source).toMatch(/mobileNavOpen/);
    expect(source).toMatch(/class="admin-mobile-nav-trigger"/);
    expect(source).toMatch(/admin-nav-shell/);
    expect(source).toMatch(/class="admin-shell-header admin-shell-header--compact"/);
    expect(source).toMatch(/class="admin-shell-summary-row"/);
    expect(source).toMatch(/工作区菜单/);
  });

  it("applies denser shell hooks and group-specific workspace tone classes", () => {
    const source = [
      readFile("src/views/admin/AdminLayoutView.vue"),
      readFile("src/components/admin/AdminShellHeader.vue"),
    ].join("\n");

    expect(source).toMatch(/admin-layout-view--workspace/);
    expect(source).toMatch(/admin-layout-view--library/);
    expect(source).toMatch(/admin-layout-view--system/);
    expect(source).toMatch(/admin-shell-header--dense/);
    expect(source).toMatch(/admin-shell-ops/);
    expect(source).toMatch(/admin-shell-pulse/);
    expect(source).not.toMatch(/admin-context-card--compact/);
  });

  it("keeps operational status framing in the shell header instead of repeating a second workspace card", () => {
    const source = [
      readFile("src/views/admin/AdminLayoutView.vue"),
      readFile("src/components/admin/AdminShellHeader.vue"),
    ].join("\n");
    const descriptionMatches = source.match(/currentAdminSection\.description/g) ?? [];

    expect(source).toMatch(/admin-shell-status-strip/);
    expect(source).toMatch(/admin-shell-status-copy/);
    expect(source).toMatch(/admin-nav-group-summary/);
    expect(source).not.toMatch(/admin-context-card--active/);
    expect(source).not.toMatch(/admin-context-chip--count/);
    expect(descriptionMatches.length).toBeLessThanOrEqual(1);
  });

  it("extracts the shell header into a dedicated admin component", () => {
    const source = readFile("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/import AdminShellHeader/);
    expect(source).toMatch(/<AdminShellHeader/);
    expect(source).not.toMatch(/class="admin-shell-header admin-shell-header--compact"/);
  });

  it("treats the mobile shell header as a compact operations strip instead of repeating desktop framing", () => {
    const source = readFile("src/components/admin/AdminShellHeader.vue");

    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-kicker\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-summary-row\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-header\s*\{[\s\S]*padding:\s*14px\s*16px/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-header h1\s*\{[\s\S]*font-size:\s*clamp\(1\.5rem,\s*7vw,\s*2rem\)/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-status-strip\s*\{[\s\S]*display:\s*flex/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-ops\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-actions\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-status-label\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-link-home\s*\{[\s\S]*display:\s*none/);
  });
});
