import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("admin style semantics", () => {
  it("defines shared admin semantic classes in global styles", () => {
    const css = read("src/styles.css");
    // admin-card now uses PACard component, not CSS class
    expect(css).toMatch(/\.admin-page-header\s*\{/);
    expect(css).toMatch(/\.admin-page-header--dashboard\s*\{/);
    expect(css).toMatch(/\.admin-page-header--content\s*\{/);
    expect(css).toMatch(/\.admin-page-header--uploads\s*\{/);
    expect(css).toMatch(/\.admin-page-header--library\s*\{/);
    expect(css).toMatch(/\.admin-page-header--taxonomy\s*\{/);
    expect(css).toMatch(/\.admin-page-header--system\s*\{/);
    expect(css).toMatch(/\.admin-page-header--account\s*\{/);
  });

  it("applies shared classes in core admin views", () => {
    const dashboard = read("src/views/admin/AdminDashboardView.vue");
    const content = read("src/views/admin/AdminContentView.vue");
    const libraryTemplate = read("src/views/admin/library/AdminLibraryView.template.html");
    const libraryStyle = read("src/views/admin/library/AdminLibraryView.css");
    const uploads = read("src/views/admin/AdminUploadsView.vue");
    const taxonomy = read("src/views/admin/AdminTaxonomyView.vue");
    const system = read("src/views/admin/AdminSystemView.vue");
    const account = read("src/views/admin/AdminAccountView.vue");
    const libraryCombined = [libraryTemplate, libraryStyle].join("\n");

    // Check that admin pages use Card components (Shadcn Card or PACard)
    // Note: Some views (like system) use child components that contain PACard
    for (const source of [dashboard, content, uploads, taxonomy]) {
      expect(source).toMatch(/<Card|<PACard/);
    }
    // System view uses child components (SystemWizardSteps, SystemEmbedUpdaterPanel) with PACard
    expect(system).toMatch(/PACard|SystemWizardSteps|SystemEmbedUpdaterPanel/);
    expect(libraryCombined).toMatch(/PACard/);

    // Check for headers
    for (const source of [dashboard, content, libraryCombined, uploads, taxonomy, system, account]) {
      expect(source).toMatch(/admin-page-header|text-2xl font-bold/);
    }
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

    // Modern admin uses Button components, not .btn classes
    for (const source of [account, dashboard, content, uploads, taxonomy, system]) {
      expect(source).not.toMatch(/\.btn\s*\{/);
    }

    for (const source of [account, content, uploads, taxonomy, system, ...splitPages]) {
      expect(source).not.toMatch(/\.field\s*\{/);
      expect(source).not.toMatch(/\.field-input\s*\{/);
    }
  });

  it("uses dashboard-specific operational hooks with Shadcn Card components", () => {
    const dashboard = read("src/views/admin/AdminDashboardView.vue");

    // New dashboard uses Shadcn Card components
    expect(dashboard).toMatch(/Card|CardHeader|CardTitle|CardDescription/);
    // Has stats display
    expect(dashboard).toMatch(/stats|total/);
  });
});
