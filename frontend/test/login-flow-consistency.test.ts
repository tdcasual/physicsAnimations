import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("login flow consistency", () => {
  it("uses form submit in login view", () => {
    const source = read("src/views/LoginView.vue");
    expect(source).toMatch(/<form[\s\S]*@submit\.prevent="submit"/);
    expect(source).toMatch(/type="submit"/);
  });

  it("hides topbar login button on /login and sanitizes modal redirects", () => {
    const source = read("src/App.vue");
    expect(source).toMatch(/isLoginRoute/);
    expect(source).toMatch(/resolveAdminRedirect/);
  });

  it("places auth actions inside the mobile more-panel and desktop inline-actions", () => {
    const source = read("src/App.vue");
    expect(source).toMatch(/topbar-more-panel/);
    expect(source).toMatch(/topbar-more-group/);
    expect(source).toMatch(/topbar-more-trigger/);
    expect(source).toMatch(/topbar-inline-actions/);
  });

  it("has autocomplete attributes for credentials", () => {
    const source = read("src/views/LoginView.vue");
    expect(source).toMatch(/autocomplete="username"/);
    expect(source).toMatch(/autocomplete="current-password"/);
  });

  it("has error handling and loading state", () => {
    const source = read("src/views/LoginView.vue");
    expect(source).toMatch(/errorText/);
    expect(source).toMatch(/loading/);
    expect(source).toMatch(/v-if="errorText"/);
  });

  it("sanitizes login redirect query to admin paths before navigating", () => {
    const source = read("src/views/LoginView.vue");
    expect(source).toMatch(/resolveAdminRedirect/);
    expect(source).toMatch(/const redirect = resolveAdminRedirect/);
  });

  it("uses modern UI components for form inputs", () => {
    const source = read("src/views/LoginView.vue");
    expect(source).toMatch(/PInput/);
    expect(source).toMatch(/PButton/);
    expect(source).toMatch(/PCard/);
  });
});
