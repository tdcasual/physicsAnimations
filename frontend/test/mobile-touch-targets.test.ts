import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("mobile touch targets", () => {
  it("defines minimum touch heights for high-frequency controls", () => {
    const globalCss = read("src/styles.css");
    const catalogView = read("src/views/CatalogView.vue");
    const catalogViewCss = read("src/views/CatalogView.css");
    const libraryFolderView = read("src/views/LibraryFolderView.vue");
    const loginView = read("src/views/LoginView.vue");
    const adminLibraryCss = read("src/views/admin/library/AdminLibraryView.css");
    const taxonomyCategoryEditor = read("src/views/admin/taxonomy/CategoryEditorPanel.vue");
    const taxonomyGroupEditor = read("src/views/admin/taxonomy/GroupEditorPanel.vue");
    const systemWizardSteps = read("src/views/admin/system/SystemWizardSteps.vue");
    const viewerView = read("src/views/ViewerView.vue");
    const adminLayout = read("src/views/admin/AdminLayoutView.vue");

    expect(globalCss).toMatch(/\.btn\s*\{[\s\S]*min-height:\s*44px/);
    expect(globalCss).toMatch(/\.field-input\s*\{[\s\S]*min-height:\s*44px/);
    expect(globalCss).toMatch(/\.checkbox\s*\{[\s\S]*min-height:\s*44px/);
    expect(globalCss).toMatch(/input\[type="checkbox"\],\s*input\[type="radio"\]\s*\{[\s\S]*inline-size:\s*18px/);
    expect(globalCss).toMatch(/input\[type="checkbox"\],\s*input\[type="radio"\]\s*\{[\s\S]*block-size:\s*18px/);
    expect(globalCss).toMatch(/\.topbar-search\s*\{[\s\S]*min-height:\s*38px/);
    expect(catalogView).toMatch(/\.catalog-tab\s*\{[\s\S]*min-height:\s*44px/);
    const quickAccessBand = read("src/components/catalog/CatalogQuickAccessBand.vue");
    expect(quickAccessBand).toMatch(/\.catalog-quick-chip\s*\{[^}]*min-height:\s*40px/);
    expect(libraryFolderView).toMatch(/<button[^>]*class="[^"]*\bbtn\b[^"]*"/);
    expect(libraryFolderView).toMatch(/<a[^>]*class="[^"]*\bbtn\b[^"]*"/);
    expect(adminLibraryCss).toMatch(/\.panel-tab\s*\{[\s\S]*min-height:\s*44px/);
    expect(adminLibraryCss).toMatch(/\.panel-section-toggle\s*\{[\s\S]*min-height:\s*44px/);
    expect(adminLibraryCss).toMatch(/\.folder-pick\s*\{[\s\S]*min-height:\s*44px/);
    expect(adminLibraryCss).toMatch(/\.batch-select-all\s*\{[\s\S]*min-height:\s*44px/);
    expect(adminLibraryCss).toMatch(/\.asset-select-wrap\s*\{[\s\S]*min-height:\s*44px/);
    expect(loginView).toMatch(/class=\"field-input\"/);
    expect(loginView).toMatch(/class=\"btn btn-primary\"/);
    expect(taxonomyCategoryEditor).toMatch(/\.subaccordion\s*>\s*summary\s*\{[\s\S]*min-height:\s*44px/);
    expect(taxonomyGroupEditor).toMatch(/\.subaccordion\s*>\s*summary\s*\{[\s\S]*min-height:\s*44px/);
    expect(viewerView).toMatch(/<button[^>]*class="[^"]*\bviewer-btn\b[^"]*"/);
    expect(viewerView).toMatch(/<a[^>]*class="[^"]*\bviewer-btn\b[^"]*"/);
    expect(systemWizardSteps).toMatch(/\.step-button\s*\{[\s\S]*min-height:\s*44px/);
    expect(viewerView).toMatch(/\.viewer-btn\s*\{[\s\S]*min-height:\s*44px/);
    expect(adminLayout).toMatch(/\.admin-link\s*\{[\s\S]*min-height:\s*44px/);
  });
});
