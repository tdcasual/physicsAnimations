import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin style semantics", () => {
  it("defines shared admin semantic classes in global styles", () => {
    const css = read("src/styles.css");
    expect(css).toMatch(/\.admin-card\s*\{/);
    expect(css).toMatch(/\.admin-page-header\s*\{/);
    expect(css).toMatch(/\.admin-page-header--dashboard\s*\{/);
    expect(css).toMatch(/\.admin-page-header--content\s*\{/);
    expect(css).toMatch(/\.admin-page-header--uploads\s*\{/);
    expect(css).toMatch(/\.admin-page-header--library\s*\{/);
    expect(css).toMatch(/\.admin-page-header--taxonomy\s*\{/);
    expect(css).toMatch(/\.admin-page-header--system\s*\{/);
    expect(css).toMatch(/\.admin-page-header--account\s*\{/);
    expect(css).toMatch(/\.admin-page-kicker\s*\{/);
    expect(css).toMatch(/\.admin-page-intro\s*\{/);
    expect(css).toMatch(/\.admin-page-intro--supporting\s*\{/);
    expect(css).toMatch(/\.admin-page-meta\s*\{/);
    expect(css).toMatch(/\.admin-page-meta-copy\s*\{/);
    expect(css).toMatch(/\.admin-optional-disclosure\s*\{/);
    expect(css).toMatch(/\.admin-optional-summary\s*\{/);
    expect(css).toMatch(/\.admin-optional-fields\s*\{/);
    expect(css).toMatch(/\.admin-workspace-grid\s*\{/);
    expect(css).toMatch(/\.admin-field\s*\{/);
    expect(css).toMatch(/\.admin-input\s*\{/);
    expect(css).toMatch(/\.admin-actions\s*\{/);
    expect(css).toMatch(/\.admin-feedback\s*\{/);
    expect(css).toMatch(/\.btn-danger\s*\{/);
  });

  it("applies shared classes in core admin views", () => {
    const dashboard = read("src/views/admin/AdminDashboardView.vue");
    const content = read("src/views/admin/AdminContentView.vue");
    const contentCreate = read("src/views/admin/content/ContentCreateForm.vue");
    const contentEdit = read("src/views/admin/content/ContentEditPanel.vue");
    const libraryTemplate = read("src/views/admin/library/AdminLibraryView.template.html");
    const libraryStyle = read("src/views/admin/library/AdminLibraryView.css");
    const libraryFolderColumn = read("src/views/admin/library/LibraryFolderColumn.vue");
    const libraryAssetColumn = read("src/views/admin/library/LibraryAssetColumn.vue");
    const libraryInspectorColumn = read("src/views/admin/library/LibraryInspectorColumn.vue");
    const uploads = read("src/views/admin/AdminUploadsView.vue");
    const uploadsCreate = read("src/views/admin/uploads/UploadsCreateForm.vue");
    const uploadsEdit = read("src/views/admin/uploads/UploadsEditPanel.vue");
    const taxonomy = read("src/views/admin/AdminTaxonomyView.vue");
    const taxonomyTree = read("src/views/admin/taxonomy/TaxonomyTreePanel.vue");
    const taxonomyGroupPanel = read("src/views/admin/taxonomy/GroupEditorPanel.vue");
    const taxonomyCategoryPanel = read("src/views/admin/taxonomy/CategoryEditorPanel.vue");
    const system = read("src/views/admin/AdminSystemView.vue");
    const systemStatusPanel = read("src/views/admin/system/SystemStatusPanel.vue");
    const systemWizardSteps = read("src/views/admin/system/SystemWizardSteps.vue");
    const account = read("src/views/admin/AdminAccountView.vue");
    const libraryCombined = [libraryTemplate, libraryStyle].join("\n");
    const libraryColumnsCombined = [libraryFolderColumn, libraryAssetColumn, libraryInspectorColumn].join("\n");
    const taxonomyCombined = [taxonomy, taxonomyTree, taxonomyGroupPanel, taxonomyCategoryPanel].join("\n");
    const systemCombined = [system, systemStatusPanel, systemWizardSteps].join("\n");
    const dashboardCombined = [dashboard].join("\n");

    for (const source of [dashboardCombined, content, uploads, taxonomy, system]) {
      expect(source).toMatch(/admin-card/);
    }
    expect(libraryColumnsCombined).toMatch(/admin-card/);

    for (const source of [dashboardCombined, content, libraryCombined, uploads, taxonomy, system, account]) {
      expect(source).toMatch(/admin-page-header/);
      expect(source).toMatch(/admin-page-kicker/);
      expect(source).toMatch(/admin-page-intro/);
      expect(source).toMatch(/admin-page-meta/);
    }

    expect(dashboardCombined).toMatch(/admin-task-copy--supporting/);

    for (const source of [dashboardCombined, content, uploads]) {
      expect(source).toMatch(/admin-page-intro--supporting/);
      expect(source).toMatch(/admin-page-meta-copy/);
    }

    for (const source of [contentCreate, uploadsCreate]) {
      expect(source).toMatch(/admin-optional-disclosure/);
      expect(source).toMatch(/admin-optional-summary/);
      expect(source).toMatch(/admin-optional-fields/);
    }

    expect(dashboardCombined).toMatch(/admin-page-header--dashboard/);
    expect(content).toMatch(/admin-page-header--content/);
    expect(libraryCombined).toMatch(/admin-page-header--library/);
    expect(uploads).toMatch(/admin-page-header--uploads/);
    expect(taxonomyCombined).toMatch(/admin-page-header--taxonomy/);
    expect(systemCombined).toMatch(/admin-page-header--system/);
    expect(account).toMatch(/admin-page-header--account/);

    for (const source of [content, libraryCombined, uploads, taxonomy, system]) {
      expect(source).toMatch(/admin-workspace-grid/);
    }

    expect([content, contentCreate, contentEdit].some((source) => /admin-actions/.test(source))).toBe(true);
    expect([uploads, uploadsCreate, uploadsEdit].some((source) => /admin-actions/.test(source))).toBe(true);
    expect(taxonomyCombined).toMatch(/admin-actions/);
    expect(systemCombined).toMatch(/admin-actions/);

    expect([content, contentCreate, contentEdit].some((source) => /admin-feedback/.test(source))).toBe(true);
    expect([uploads, uploadsCreate, uploadsEdit].some((source) => /admin-feedback/.test(source))).toBe(true);
    expect(taxonomyCombined).toMatch(/admin-feedback/);
    expect(systemCombined).toMatch(/admin-feedback/);

    expect(content).not.toMatch(/\.btn-danger\s*\{/);
    expect(uploads).not.toMatch(/\.btn-danger\s*\{/);
  });

  it("avoids redefining shared base form/button styles in admin pages", () => {
    const account = read("src/views/admin/AdminAccountView.vue");
    const dashboard = read("src/views/admin/AdminDashboardView.vue");
    const content = read("src/views/admin/AdminContentView.vue");
    const uploads = read("src/views/admin/AdminUploadsView.vue");
    const taxonomy = read("src/views/admin/AdminTaxonomyView.vue");
    const system = read("src/views/admin/AdminSystemView.vue");
    const taxonomyTree = read("src/views/admin/taxonomy/TaxonomyTreePanel.vue");
    const taxonomyGroupPanel = read("src/views/admin/taxonomy/GroupEditorPanel.vue");
    const taxonomyCategoryPanel = read("src/views/admin/taxonomy/CategoryEditorPanel.vue");
    const systemStatusPanel = read("src/views/admin/system/SystemStatusPanel.vue");
    const systemWizardSteps = read("src/views/admin/system/SystemWizardSteps.vue");
    const splitPages = [
      taxonomyTree,
      taxonomyGroupPanel,
      taxonomyCategoryPanel,
      systemStatusPanel,
      systemWizardSteps,
    ];

    for (const source of [account, dashboard, content, uploads, taxonomy, system]) {
      expect(source).not.toMatch(/\.btn\s*\{/);
    }

    for (const source of [account, content, uploads, taxonomy, system, ...splitPages]) {
      expect(source).not.toMatch(/\.field\s*\{/);
      expect(source).not.toMatch(/\.field-input\s*\{/);
    }
  });

  it("uses dashboard-specific operational hooks instead of only brochure-like cards", () => {
    const dashboard = read("src/views/admin/AdminDashboardView.vue");
    const layout = read("src/views/admin/AdminLayoutView.vue");

    expect(dashboard).toMatch(/admin-task-card--queue/);
    expect(dashboard).toMatch(/admin-signal-card--metric/);
    expect(layout).toMatch(/admin-shell-status-strip/);
  });
});
