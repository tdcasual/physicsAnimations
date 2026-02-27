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
    expect(css).toMatch(/\.admin-field\s*\{/);
    expect(css).toMatch(/\.admin-input\s*\{/);
    expect(css).toMatch(/\.admin-actions\s*\{/);
    expect(css).toMatch(/\.admin-feedback\s*\{/);
    expect(css).toMatch(/\.btn-danger\s*\{/);
  });

  it("applies shared classes in core admin views", () => {
    const content = read("src/views/admin/AdminContentView.vue");
    const contentCreate = read("src/views/admin/content/ContentCreateForm.vue");
    const contentEdit = read("src/views/admin/content/ContentEditPanel.vue");
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
    const taxonomyCombined = [taxonomy, taxonomyTree, taxonomyGroupPanel, taxonomyCategoryPanel].join("\n");
    const systemCombined = [system, systemStatusPanel, systemWizardSteps].join("\n");

    for (const source of [content, uploads, taxonomy, system]) {
      expect(source).toMatch(/admin-card/);
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
});
