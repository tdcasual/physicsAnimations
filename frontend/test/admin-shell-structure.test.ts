import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function readFile(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("admin shell structure", () => {
  it("moves grouped admin navigation config and layout styles into dedicated modules", () => {
    const source = readFile("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/features\/admin\/adminNavConfig/);
  });

  it("organizes admin modules into grouped workspace navigation", () => {
    const source = [
      readFile("src/views/admin/AdminLayoutView.vue"),
      readFile("src/components/admin/AdminShellHeader.vue"),
      readFile("src/features/admin/adminNavConfig.ts"),
    ].join("\n");

    expect(source).toMatch(/内容管理|资源结构|系统设置/);
  });

  it("uses Shadcn components and Tailwind for responsive mobile navigation", () => {
    const source = [
      readFile("src/views/admin/AdminLayoutView.vue"),
      readFile("src/views/admin/AdminLayoutView.css"),
      readFile("src/components/admin/AdminShellHeader.vue"),
      readFile("src/features/admin/adminNavConfig.ts"),
    ].join("\n");

    expect(source).toMatch(/mobileNavOpen/);
    expect(source).toMatch(/currentAdminGroup\.items/);
    expect(source).toMatch(/切换模块/);
    // Check for CSS responsive patterns
    expect(source).toMatch(/sticky|fixed/);
    expect(source).toMatch(/flex-wrap/);
    expect(source).toMatch(/@media/);
  });

  it("applies glassmorphism and modern styling to shell components", () => {
    const source = [
      readFile("src/views/admin/AdminLayoutView.vue"),
      readFile("src/views/admin/AdminLayoutView.css"),
      readFile("src/components/admin/AdminShellHeader.vue"),
      readFile("src/components/admin/AdminShellHeader.css"),
    ].join("\n");

    // Check for modern styling in both Tailwind and CSS
    expect(source).toMatch(/backdrop-blur|backdrop-filter/);
    expect(source).toMatch(/border/);
    expect(source).toMatch(/rounded|border-radius/);
    expect(source).toMatch(/shadow/);
  });

  it("keeps operational status framing in the shell header", () => {
    const source = [
      readFile("src/views/admin/AdminLayoutView.vue"),
      readFile("src/components/admin/AdminShellHeader.vue"),
    ].join("\n");

    expect(source).toMatch(/currentAdminSection/);
    expect(source).toMatch(/管理后台|内容管理|资源库/);
  });

  it("extracts the shell header into a dedicated admin component", () => {
    const source = readFile("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/import AdminShellHeader/);
    expect(source).toMatch(/<AdminShellHeader/);
  });

  it("uses CSS with media queries for responsive layouts", () => {
    const source = [
      readFile("src/components/admin/AdminShellHeader.vue"),
      readFile("src/components/admin/AdminShellHeader.css"),
      readFile("src/views/admin/AdminLayoutView.css"),
    ].join("\n");

    // Check for responsive patterns in CSS
    expect(source).toMatch(/@media/);
    expect(source).toMatch(/max-width/);
    expect(source).toMatch(/admin-shell-header/);
  });

  it("reframes library and taxonomy mobile views as progressive-disclosure task flows", () => {
    const library = [
      readFile("src/views/admin/AdminLibraryView.vue"),
      readFile("src/views/admin/library/AdminLibraryView.template.html"),
      readFile("src/views/admin/library/AdminLibraryView.css"),
    ].join("\n");
    const taxonomy = [
      readFile("src/views/admin/AdminTaxonomyView.vue"),
      readFile("src/views/admin/taxonomy/TaxonomyTreePanel.vue"),
      readFile("src/views/admin/taxonomy/GroupEditorPanel.vue"),
      readFile("src/views/admin/taxonomy/CategoryEditorPanel.vue"),
    ].join("\n");

    expect(library).toMatch(/library-mobile-taskbar/);
    expect(library).toMatch(/library-mobile-primary-actions/);
    expect(library).toMatch(/library-mobile-sheet/);
    expect(library).toMatch(/openMobileLibrarySheet/);
    expect(library).toMatch(/closeMobileLibrarySheet/);

    expect(taxonomy).toMatch(/taxonomy-mobile-actions/);
    expect(taxonomy).toMatch(/taxonomy-editor-sheet/);
    expect(taxonomy).toMatch(/AdminSplitLayout/);
    expect(taxonomy).toMatch(/openCreateGroupSheet/);
    expect(taxonomy).toMatch(/closeMobileEditorSheet/);
  });
});
