import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin account mobile input behavior", () => {
  it("disables auto-capitalization and auto-correct on credential fields", () => {
    const source = read("src/views/admin/AdminAccountView.vue");
    // Check for PAInput component usage with proper name attributes
    expect(source).toMatch(/name="username"/);
    expect(source).toMatch(/name="current_password"/);
    expect(source).toMatch(/name="new_password"/);
    expect(source).toMatch(/name="confirm_new_password"/);
    // Check PAInput component has default autocapitalize/autocorrect/spellcheck
    const inputComponent = read("src/components/ui/patterns/PAInput.vue");
    expect(inputComponent).toMatch(/autocapitalize:\s*"none"/);
    expect(inputComponent).toMatch(/autocorrect:\s*"off"/);
    expect(inputComponent).toMatch(/spellcheck:\s*"false"/);
  });
});
