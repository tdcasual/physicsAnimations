import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin account password mismatch feedback", () => {
  it("recomputes confirmPassword mismatch feedback when either password field changes", () => {
    const source = read("src/views/admin/AdminAccountView.vue");

    expect(source).toMatch(/import\s+\{\s*(computed,\s*)?ref,\s*watch\s*\}\s+from\s+"vue"/);
    expect(source).toMatch(/function\s+syncConfirmPasswordError\(\)/);
    expect(source).toMatch(/watch\(\[newPassword,\s*confirmPassword\],\s*\(\)\s*=>\s*\{[\s\S]*syncConfirmPasswordError\(\);[\s\S]*\}\)/);
    expect(source).toMatch(/clearFieldErrors\("confirmPassword"\)/);
  });
});
