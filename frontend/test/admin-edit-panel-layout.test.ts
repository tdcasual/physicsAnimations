import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

function assertSplitLayout(viewSource: string, editPanelSource: string) {
  expect(viewSource).toMatch(/class="[^"]*workspace-grid/);
  expect(viewSource).toMatch(/class="[^"]*list-panel/);
  expect(viewSource).toMatch(/class="[^"]*editor-panel/);
  expect(editPanelSource).toMatch(/class="[^"]*action-feedback/);
  expect(viewSource).not.toMatch(/v-if="editingId\s*===\s*item\.id"\s+class="item-edit"/);
}

describe("admin edit panel split layout", () => {
  it("uses split list/editor layout in admin content view", () => {
    const view = readSource("src/views/admin/AdminContentView.vue");
    const editPanel = readSource("src/views/admin/content/ContentEditPanel.vue");
    assertSplitLayout(view, editPanel);
  });

  it("uses split list/editor layout in admin uploads view", () => {
    const view = readSource("src/views/admin/AdminUploadsView.vue");
    const editPanel = readSource("src/views/admin/uploads/UploadsEditPanel.vue");
    assertSplitLayout(view, editPanel);
  });
});
