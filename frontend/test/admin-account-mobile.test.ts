import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin account mobile input behavior", () => {
  it("disables auto-capitalization and auto-correct on credential fields", () => {
    const source = read("src/views/admin/AdminAccountView.vue");
    expect(source).toMatch(/name="username"[\s\S]*autocapitalize="none"/);
    expect(source).toMatch(/name="username"[\s\S]*autocorrect="off"/);
    expect(source).toMatch(/name="username"[\s\S]*spellcheck="false"/);
    expect(source).toMatch(/name="current_password"[\s\S]*autocapitalize="none"/);
    expect(source).toMatch(/name="new_password"[\s\S]*autocapitalize="none"/);
    expect(source).toMatch(/name="confirm_new_password"[\s\S]*autocapitalize="none"/);
  });
});
