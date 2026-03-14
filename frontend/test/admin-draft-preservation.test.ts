import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin draft preservation", () => {
  it("keeps content and upload edit panels available when the current item falls out of filtered results", () => {
    const content = read("src/features/admin/content/useContentAdmin.ts");
    const uploads = read("src/features/admin/uploads/useUploadAdmin.ts");

    expect(content).toMatch(/const\s+editingSnapshot\s*=\s*ref<AdminItem \| null>\(null\)/);
    expect(content).toMatch(/items\.value\.find\(\(item\) => item\.id === editingId\.value\) \|\| editingSnapshot\.value \|\| null/);
    expect(content).toMatch(/function\s+resetEdit\(\)\s*\{[\s\S]*editingSnapshot\.value = null;/);
    expect(content).toMatch(/function\s+syncEditStateWithItems\(\)\s*\{[\s\S]*if \(currentItem\)\s*\{[\s\S]*editingSnapshot\.value = currentItem;/);
    expect(content).not.toMatch(/function\s+syncEditStateWithItems\(\)\s*\{[\s\S]*resetEdit\(\)/);

    expect(uploads).toMatch(/const\s+editingSnapshot\s*=\s*ref<AdminItem \| null>\(null\)/);
    expect(uploads).toMatch(/items\.value\.find\(\(item\) => item\.id === editingId\.value\) \|\| editingSnapshot\.value \|\| null/);
    expect(uploads).toMatch(/function\s+resetEdit\(\)\s*\{[\s\S]*editingSnapshot\.value = null;/);
    expect(uploads).toMatch(/function\s+syncEditStateWithItems\(\)\s*\{[\s\S]*if \(currentItem\)\s*\{[\s\S]*editingSnapshot\.value = currentItem;/);
    expect(uploads).not.toMatch(/function\s+syncEditStateWithItems\(\)\s*\{[\s\S]*resetEdit\(\)/);
  });

  it("does not re-sync taxonomy edit forms on search-only changes when selection stays the same", () => {
    const lifecycle = read("src/features/admin/taxonomy/useTaxonomyAdminLifecycle.ts");

    expect(lifecycle).toMatch(/const\s+previousSelection\s*=\s*selection\.value\s*\?\s*\{\s*\.\.\.selection\.value\s*\}\s*:\s*null/);
    expect(lifecycle).toMatch(/if\s*\([\s\S]*selection\.value\?\.kind !== previousSelection\?\.kind[\s\S]*\|\|[\s\S]*selection\.value\?\.id !== previousSelection\?\.id[\s\S]*\)\s*\{[\s\S]*syncFormsFromSelection\(\);/);
  });

  it("confirms before switching to a different record when the current draft has unsaved changes", () => {
    const content = read("src/features/admin/content/useContentAdmin.ts");
    const uploads = read("src/features/admin/uploads/useUploadAdmin.ts");

    expect(content).toMatch(/const\s+hasPendingEditChanges\s*=\s*computed\(/);
    expect(content).toMatch(/window\.confirm\("当前编辑内容有未保存更改，确定切换吗？"\)/);
    expect(content).toMatch(/function\s+beginEdit\(item:\s*AdminItem,\s*options:\s*\{\s*force\?:\s*boolean\s*\}\s*=\s*\{\}\)/);
    expect(content).toMatch(/if\s*\(item\.id === editingId\.value && !options\.force\) return/);

    expect(uploads).toMatch(/const\s+hasPendingEditChanges\s*=\s*computed\(/);
    expect(uploads).toMatch(/window\.confirm\("当前编辑内容有未保存更改，确定切换吗？"\)/);
    expect(uploads).toMatch(/function\s+beginEdit\(item:\s*AdminItem,\s*options:\s*\{\s*force\?:\s*boolean\s*\}\s*=\s*\{\}\)/);
    expect(uploads).toMatch(/if\s*\(item\.id === editingId\.value && !options\.force\) return/);
  });

});
