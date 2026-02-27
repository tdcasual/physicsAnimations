import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin preview default open", () => {
  it("content admin keeps preview normalization in composable and list panel", () => {
    const logic = read("src/features/admin/content/useContentAdmin.ts");
    const listPanel = read("src/views/admin/content/ContentListPanel.vue");
    const page = read("src/views/admin/AdminContentView.vue");
    expect(logic).toMatch(/function previewHref\(item: AdminItem\)/);
    expect(logic).toMatch(/normalizePublicUrl\(item\.src \|\| viewerHref\(item\.id\)\)/);
    expect(listPanel).toMatch(/:href="props\.previewHref\(item\)"/);
    expect(page).toMatch(/:preview-href="vm\.previewHref"/);
  });

  it("uploads admin keeps preview normalization in composable and list panel", () => {
    const logic = read("src/features/admin/uploads/useUploadAdmin.ts");
    const listPanel = read("src/views/admin/uploads/UploadsListPanel.vue");
    const page = read("src/views/admin/AdminUploadsView.vue");
    expect(logic).toMatch(/function previewHref\(item: AdminItem\)/);
    expect(logic).toMatch(/normalizePublicUrl\(item\.src \|\| viewerHref\(item\.id\)\)/);
    expect(listPanel).toMatch(/:href="props\.previewHref\(item\)"/);
    expect(page).toMatch(/:preview-href="vm\.previewHref"/);
  });
});
