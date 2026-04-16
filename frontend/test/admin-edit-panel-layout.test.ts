import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

function assertSplitLayout(viewSource: string, splitLayoutSource: string, editPanelSource: string) {
  expect(viewSource).toMatch(/AdminSplitLayout/);
  expect(viewSource).toMatch(/class="[^"]*list-panel/);
  expect(splitLayoutSource).toMatch(/class="admin-split-layout__grid"/);
  expect(splitLayoutSource).toMatch(/panel-class="admin-split-layout__editor/);
  expect(editPanelSource).toMatch(/class="[^"]*action-feedback/);
  expect(viewSource).not.toMatch(/v-if="editingId\s*===\s*item\.id"\s+class="item-edit"/);
}

describe("admin edit panel split layout", () => {
  it("uses split list/editor layout in admin content view", () => {
    const view = readSource("src/views/admin/AdminContentView.vue");
    const splitLayout = readSource("src/components/admin/AdminSplitLayout.vue");
    const editPanel = readSource("src/views/admin/content/ContentEditPanel.vue");
    assertSplitLayout(view, splitLayout, editPanel);
  });

  it("uses split list/editor layout in admin uploads view", () => {
    const view = readSource("src/views/admin/AdminUploadsView.vue");
    const splitLayout = readSource("src/components/admin/AdminSplitLayout.vue");
    const editPanel = readSource("src/views/admin/uploads/UploadsEditPanel.vue");
    assertSplitLayout(view, splitLayout, editPanel);
  });
});
