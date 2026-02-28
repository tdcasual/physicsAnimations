import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("login flow consistency", () => {
  it("uses form submit in login view instead of password-only keydown handler", () => {
    const source = read("src/views/LoginView.vue");
    expect(source).toMatch(/<form[\s\S]*@submit\.prevent=\"submit\"/);
    expect(source).not.toMatch(/@keydown\.enter\.prevent=\"submit\"/);
    expect(source).toMatch(/type=\"submit\"/);
  });

  it("hides topbar login button on /login and redirects after modal login success", () => {
    const source = read("src/App.vue");
    expect(source).toMatch(/isLoginRoute/);
    expect(source).toMatch(/v-if=\"!auth\.loggedIn && !isLoginRoute\"/);
    expect(source).toMatch(/await router\.replace\(\"\/admin\/dashboard\"\)/);
  });

  it("sanitizes login redirect query to admin paths before navigating", () => {
    const source = read("src/views/LoginView.vue");
    expect(source).toMatch(/resolveAdminRedirect/);
    expect(source).toMatch(/const redirect = resolveAdminRedirect\(route\.query\.redirect\)/);
    expect(source).not.toMatch(/const redirect = String\(route\.query\.redirect \|\| \"\"\)\.trim\(\)/);
  });
});
