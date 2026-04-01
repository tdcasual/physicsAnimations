import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin inline feedback", () => {
  it("uses inline field errors in content, uploads, account and system forms", () => {
    const contentLogic = read("src/features/admin/content/useContentAdmin.ts");
    const uploadsLogic = read("src/features/admin/uploads/useUploadAdmin.ts");
    const contentForm = read("src/views/admin/content/ContentCreateForm.vue");
    const uploadsForm = read("src/views/admin/uploads/UploadsCreateForm.vue");
    const contentPage = read("src/views/admin/AdminContentView.vue");
    const uploadsPage = read("src/views/admin/AdminUploadsView.vue");
    const account = read("src/views/admin/AdminAccountView.vue");
    const systemView = read("src/views/admin/AdminSystemView.vue");
    const systemState = read("src/features/admin/system/useSystemWizard.ts");
    const systemSteps = read("src/views/admin/system/SystemWizardSteps.vue");
    const systemConnectionStep = read("src/views/admin/system/SystemWizardConnectionStep.vue");
    const systemWizardCombined = [systemSteps, systemConnectionStep].join("\n");

    for (const source of [contentLogic, uploadsLogic, account]) {
      expect(source).toMatch(/const fieldErrors = ref<Record<string, string>>\(\{\}\)/);
      expect(source).toMatch(/function setFieldError/);
      expect(source).toMatch(/function clearFieldErrors/);
      expect(source).toMatch(/function getFieldError/);
    }
    expect(systemState).toMatch(/useFieldErrors/);
    expect(systemState).toMatch(/const \{ fieldErrors, setFieldError, clearFieldErrors, getFieldError \} = useFieldErrors\(\)/);

    for (const source of [contentForm, uploadsForm, account, systemWizardCombined]) {
      expect(source).toMatch(/field-error-text/);
      expect(source).toMatch(/has-error/);
    }

    expect(contentPage).toMatch(/getFieldError\('createLinkUrl'\)/);
    expect(uploadsPage).toMatch(/getFieldError\('uploadFile'\)/);
    expect(account).toMatch(/getFieldError\("currentPassword"\)/);
    expect(account).toMatch(/getFieldError\("confirmPassword"\)/);
    expect(systemView).toMatch(/getFieldError/);
    expect(systemWizardCombined).toMatch(/getFieldError\("webdavUrl"\)/);
  });
});
