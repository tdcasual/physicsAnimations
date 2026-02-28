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
    expect(groupPanel).toMatch(/class="[^"]*action-feedback/);
    expect(categoryPanel).toMatch(/class="[^"]*action-feedback/);
  });
});
