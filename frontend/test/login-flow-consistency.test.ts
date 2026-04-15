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

  it("hides topbar login button on /login and sanitizes modal redirects through the shared helper", () => {
    const source = read("src/App.vue");
    expect(source).toMatch(/isLoginRoute/);
    expect(source).toMatch(/v-if=\"!auth\.loggedIn && !isLoginRoute\"/);
    expect(source).toMatch(/resolveAdminRedirect/);
    expect(source).toMatch(/const redirect = resolveAdminRedirect\(route\.query\.redirect\)/);
    expect(source).not.toMatch(/await router\.replace\(\"\/admin\/dashboard\"\)/);
  });

  it("places auth actions inside the mobile menu panel and desktop actions", () => {
    const source = read("src/App.vue");
    expect(source).toMatch(/mobileMenuOpen/);
    expect(source).toMatch(/hidden md:flex/);
    expect(source).toMatch(/md:hidden/);
  });

  it("disables auto-capitalization and auto-correct in app-shell login modal inputs", () => {
    const source = read("src/App.vue");
    expect(source).toMatch(/autocapitalize="none"/);
    expect(source).toMatch(/autocorrect="off"/);
  });

  it("clears stale login errors while typing in the app-shell login modal", () => {
    const source = read("src/App.vue");
    expect(source).toMatch(/function\s+clearLoginError\(\)\s*\{/);
    expect(source).toMatch(/if\s*\(!loginError\.value\) return/);
    expect(source).toMatch(/loginError\.value\s*=\s*""/);
    expect(source.match(/@input="clearLoginError"/g)?.length ?? 0).toBe(2);
  });

  it("locks body scroll while login modal is open and restores it after close", () => {
    const source = read("src/App.vue");
    expect(source).toMatch(/let bodyOverflowBeforeLogin = ""/);
    expect(source).toMatch(/bodyOverflowBeforeLogin = document\.body\.style\.overflow/);
    expect(source).toMatch(/document\.body\.style\.overflow = "hidden"/);
    expect(source).toMatch(/document\.body\.style\.overflow = bodyOverflowBeforeLogin/);
  });

  it("focuses the actual username input element inside the app-shell login modal", () => {
    const source = read("src/App.vue");
    expect(source).toMatch(/loginUsernameInputRef/);
    expect(source).toMatch(/querySelector\("input"\)/);
    expect(source).not.toMatch(/loginUsernameInputRef\.value\?\.focus\(\)/);
  });

  it("sanitizes login redirect query to admin paths before navigating", () => {
    const source = read("src/views/LoginView.vue");
    expect(source).toMatch(/resolveAdminRedirect/);
    expect(source).toMatch(/const redirect = resolveAdminRedirect\(route\.query\.redirect\)/);
    expect(source).not.toMatch(/const redirect = String\(route\.query\.redirect \|\| \"\"\)\.trim\(\)/);
  });

  it("disables mobile auto-capitalization and auto-correct for credentials", () => {
    const source = read("src/views/LoginView.vue");
    expect(source).toMatch(/autocomplete=\"username\"/);
    expect(source).toMatch(/PAInput/);
  });

  it("reuses shared base form/button styles instead of redefining local duplicates", () => {
    const source = read("src/views/LoginView.vue");
    expect(source).not.toMatch(/\.field\s*\{/);
    expect(source).not.toMatch(/\.field-input\s*\{/);
    expect(source).not.toMatch(/\.btn\s*\{/);
  });
});
