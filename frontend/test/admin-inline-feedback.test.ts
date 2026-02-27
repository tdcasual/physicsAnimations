import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin inline feedback", () => {
  it("uses inline field errors in content, uploads, account and system forms", () => {
    const content = read("src/views/admin/AdminContentView.vue");
    const uploads = read("src/views/admin/AdminUploadsView.vue");
    const account = read("src/views/admin/AdminAccountView.vue");
    const system = read("src/views/admin/AdminSystemView.vue");

    for (const source of [content, uploads, account, system]) {
      expect(source).toMatch(/const fieldErrors = ref<Record<string, string>>\(\{\}\)/);
      expect(source).toMatch(/function setFieldError/);
      expect(source).toMatch(/function clearFieldErrors/);
      expect(source).toMatch(/function getFieldError/);
      expect(source).toMatch(/field-error-text/);
      expect(source).toMatch(/has-error/);
    }

    expect(content).toMatch(/getFieldError\("createLinkUrl"\)/);
    expect(uploads).toMatch(/getFieldError\("uploadFile"\)/);
    expect(account).toMatch(/getFieldError\("currentPassword"\)/);
    expect(account).toMatch(/getFieldError\("confirmPassword"\)/);
    expect(system).toMatch(/getFieldError\("webdavUrl"\)/);
  });
});
