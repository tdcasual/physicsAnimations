import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin taxonomy action feedback", () => {
  it("splits taxonomy page into composable + tree/edit panels with feedback hooks", () => {
    const view = read("src/views/admin/AdminTaxonomyView.vue");
    const state = read("src/features/admin/taxonomy/useTaxonomyAdmin.ts");
    const draftState = read("src/features/admin/taxonomy/useTaxonomyAdminDraftState.ts");
    const treePanel = read("src/views/admin/taxonomy/TaxonomyTreePanel.vue");
    const groupPanel = read("src/views/admin/taxonomy/GroupEditorPanel.vue");
    const categoryPanel = read("src/views/admin/taxonomy/CategoryEditorPanel.vue");
    const combinedState = `${state}\n${draftState}`;

    expect(view).toMatch(/import\s+\{\s*useTaxonomyAdmin\s*\}/);
    expect(view).toMatch(/import\s+TaxonomyTreePanel/);
    expect(view).toMatch(/import\s+GroupEditorPanel/);
    expect(view).toMatch(/import\s+CategoryEditorPanel/);
    expect(view).toMatch(/const\s+taxonomy\s*=\s*useTaxonomyAdmin\(/);

    expect(combinedState).toMatch(/const\s+actionFeedback\s*=\s*ref\(""\)/);
    expect(combinedState).toMatch(/const\s+actionFeedbackError\s*=\s*ref\(false\)/);

    expect(treePanel).toMatch(/class="[^"]*tree-list/);
    expect(groupPanel).toMatch(/class="[^"]*admin-feedback/);
    expect(categoryPanel).toMatch(/class="[^"]*admin-feedback/);
  });

  it("keeps long group and category labels wrapped on narrow mobile screens", () => {
    const treePanel = read("src/views/admin/taxonomy/TaxonomyTreePanel.vue");
    const groupPanel = read("src/views/admin/taxonomy/GroupEditorPanel.vue");
    const categoryPanel = read("src/views/admin/taxonomy/CategoryEditorPanel.vue");
    expect(treePanel).toMatch(/class="[^"]*group-title[^"]*break-anywhere"/);
    expect(treePanel).toMatch(/class="[^"]*category-title[^"]*break-anywhere"/);
    expect(treePanel).toMatch(/\.group-title,\s*\.category-title\s*\{[\s\S]*word-break:\s*break-word/);
    expect(groupPanel).toMatch(/class="[^"]*admin-panel-title[^"]*break-anywhere"/);
    expect(categoryPanel).toMatch(/class="[^"]*admin-panel-title[^"]*break-anywhere"/);
  });
});
