import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("mobile touch targets", () => {
  it("defines minimum touch heights for high-frequency controls", () => {
    const globalCss = read("src/styles.css");
    const catalogView = read("src/views/CatalogView.vue");
    const loginView = read("src/views/LoginView.vue");
    const systemWizardSteps = read("src/views/admin/system/SystemWizardSteps.vue");
    const viewerView = read("src/views/ViewerView.vue");
    const adminLayout = read("src/views/admin/AdminLayoutView.vue");

    expect(globalCss).toMatch(/\.btn\s*\{[\s\S]*min-height:\s*40px/);
    expect(globalCss).toMatch(/\.field-input\s*\{[\s\S]*min-height:\s*40px/);
    expect(globalCss).toMatch(/\.checkbox\s*\{[\s\S]*min-height:\s*40px/);
    expect(catalogView).toMatch(/\.catalog-search\s*\{[\s\S]*min-height:\s*40px/);
    expect(catalogView).toMatch(/\.catalog-tab\s*\{[\s\S]*min-height:\s*40px/);
    expect(loginView).toMatch(/\.field-input\s*\{[\s\S]*min-height:\s*40px/);
    expect(systemWizardSteps).toMatch(/\.step-button\s*\{[\s\S]*min-height:\s*40px/);
    expect(viewerView).toMatch(/\.viewer-btn\s*\{[\s\S]*min-height:\s*40px/);
    expect(adminLayout).toMatch(/\.admin-link\s*\{[\s\S]*min-height:\s*40px/);
  });
});
