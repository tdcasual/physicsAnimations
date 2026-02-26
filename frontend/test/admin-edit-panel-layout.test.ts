import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

function assertSplitLayout(source: string) {
  expect(source).toMatch(/class="[^"]*workspace-grid/);
  expect(source).toMatch(/class="[^"]*list-panel/);
  expect(source).toMatch(/class="[^"]*editor-panel/);
  expect(source).toMatch(/class="[^"]*action-feedback/);
  expect(source).not.toMatch(/v-if="editingId\s*===\s*item\.id"\s+class="item-edit"/);
}

describe("admin edit panel split layout", () => {
  it("uses split list/editor layout in admin content view", () => {
    const source = readSource("src/views/admin/AdminContentView.vue");
    assertSplitLayout(source);
  });

  it("uses split list/editor layout in admin uploads view", () => {
    const source = readSource("src/views/admin/AdminUploadsView.vue");
    assertSplitLayout(source);
  });
});
