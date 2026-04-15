import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin upload validation guards", () => {
  it("prevents submitting whitespace-only edit title before request is sent", () => {
    const source = read("src/features/admin/uploads/useUploadAdminActions.ts");
    expect(source).toMatch(/const\s+title\s*=\s*ctx\.editTitle\.value\.trim\(\)/);
    expect(source).toMatch(/if\s*\(!title\)/);
    expect(source).toMatch(/setFieldError\("editTitle",\s*"标题不能为空。"\)/);
    expect(source).toMatch(/setActionFeedback\("标题不能为空。",\s*true\)/);
  });

  it("maps backend invalid_title to field-level editTitle feedback", () => {
    const source = read("src/features/admin/uploads/useUploadAdminActions.ts");
    expect(source).toMatch(/e\?\.data\?\.error\s*===\s*"invalid_title"/);
    expect(source).toMatch(/setFieldError\("editTitle",\s*"标题不能为空。"\)/);
  });

  it("renders edit title error inline in uploads edit panel", () => {
    const source = read("src/views/admin/uploads/UploadsEditPanel.vue");
    expect(source).toMatch(/editTitleError:\s*string/);
    // Error display now handled by PAField component
    expect(source).toMatch(/PAField/);
    expect(source).toMatch(/:error="props\.editTitleError"/);
    // PAField internally renders error state with text-destructive
    const fieldComponent = read("src/components/ui/patterns/PAField.vue");
    expect(fieldComponent).toMatch(/text-destructive/);
    expect(fieldComponent).toMatch(/border-destructive/);
  });

  it("passes edit title field error from view-model to uploads edit panel", () => {
    const source = read("src/views/admin/AdminUploadsView.vue");
    expect(source).toMatch(/:edit-title-error="vm\.getFieldError\('editTitle'\)"/);
    expect(source).toMatch(
      /@update:edit-title="[\s\S]*vm\.editTitle = \$event;[\s\S]*vm\.clearFieldErrors\('editTitle'\)/,
    );
  });
});
