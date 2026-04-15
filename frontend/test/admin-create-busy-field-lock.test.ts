import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin create form busy field locking", () => {
  it("locks content link create fields while save is in flight", () => {
    const source = read("src/views/admin/content/ContentCreateForm.vue");
    // Uses PAInput components with disabled binding
    expect(source).toMatch(/PAInput[\s\S]*:disabled="props\.saving"/);
    expect(source).toMatch(/PAInput[\s\S]*type="url"/);
    expect(source).toMatch(/PAInput[\s\S]*type="textarea"/);
    expect(source).toMatch(/<PAButton :disabled="props\.saving" @click="emit\('submit'\)">添加<\/PAButton>/);
  });

  it("locks upload create fields while save is in flight", () => {
    const source = read("src/views/admin/uploads/UploadsCreateForm.vue");
    // Uses PAInput components with disabled binding
    expect(source).toMatch(/PAInput|input.*:disabled="props\.saving"/);
    expect(source).toMatch(/<PAButton :disabled="props\.saving" @click="emit\('submit'\)">上传<\/PAButton>/);
  });
});
