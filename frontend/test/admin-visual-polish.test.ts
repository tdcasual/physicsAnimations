import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("admin visual polish", () => {
  it("turns the dashboard into a task-oriented workspace", () => {
    const dashboard = read("src/views/admin/AdminDashboardView.vue");

    expect(dashboard).toMatch(/admin-page-header admin-page-header--dashboard/);
    expect(dashboard).toMatch(/admin-task-grid/);
    expect(dashboard).toMatch(/admin-task-grid--dense/);
    expect(dashboard).toMatch(/admin-task-card/);
    expect(dashboard).toMatch(/admin-task-card--queue/);
    expect(dashboard).toMatch(/admin-task-card--focus/);
    expect(dashboard).toMatch(/admin-task-card--secondary/);
    expect(dashboard).toMatch(/admin-signal-card--metric/);
    expect(dashboard).toMatch(/下一步/);
    expect(dashboard).toMatch(/今日工作台/);
  });

  it("adds framed workspace surfaces and nav hover feedback", () => {
    const source = [
      read("src/views/admin/AdminLayoutView.vue"),
      read("src/components/admin/AdminShellHeader.vue"),
    ].join("\n");

    expect(source).toMatch(/admin-nav-bar::before/);
    expect(source).toMatch(/\.admin-link:hover\s*\{/);
    expect(source).toMatch(/\.admin-shell-status-strip\s*\{/);
    expect(source).toMatch(/\.admin-nav-group-summary\s*\{/);
    expect(source).toMatch(/\.admin-shell-header--compact\s*\{/);
    expect(source).toMatch(/\.admin-layout-view--workspace\s*\{/);
    expect(source).toMatch(/\.admin-layout-view--library\s*\{/);
    expect(source).toMatch(/\.admin-layout-view--system\s*\{/);
    expect(source).toMatch(/\.admin-shell-ops\s*\{/);
    expect(source).toMatch(/\.admin-shell-pulse\s*\{/);
    expect(source).toMatch(/\.admin-mobile-nav-strip\s*\{/);
    expect(source).toMatch(/\.admin-mobile-nav-links\s*\{/);
    expect(source).toMatch(/\.admin-nav-sheet-heading\s*\{/);
  });

  it("turns the mobile workspace menu into a bottom-sheet control deck", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-nav-bar\s*\{[\s\S]*position:\s*fixed[\s\S]*left:\s*12px[\s\S]*right:\s*12px[\s\S]*bottom:\s*12px/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-nav-bar\.is-open\s*\{[\s\S]*display:\s*grid[\s\S]*animation:/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-nav-sheet-heading\s*\{[\s\S]*display:\s*flex/);
  });

  it("compresses repeated admin shell copy on mobile into an app-bar plus quick section strip", () => {
    const source = [read("src/views/admin/AdminLayoutView.vue"), read("src/components/admin/AdminShellHeader.vue")].join("\n");

    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-description\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-note\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-header\s*\{[\s\S]*border:\s*0[\s\S]*background:\s*transparent/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-mobile-context\s*\{[\s\S]*display:\s*inline-flex/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-summary-row\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-copy\s*\{[\s\S]*gap:\s*4px/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-header\s*\{[\s\S]*padding:\s*2px\s*2px\s*0/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-ops\s*\{[\s\S]*display:\s*flex[\s\S]*justify-content:\s*flex-end/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-status-strip\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-mobile-nav-strip\s*\{[\s\S]*position:\s*sticky[\s\S]*top:\s*calc\(var\(--app-topbar-height,\s*0px\)\s*\+\s*8px\)/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-mobile-nav-summary\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-mobile-nav-link-copy\s*\{[\s\S]*display:\s*none/);
  });

  it("treats dashboard, content, and uploads headers as compact operational framing on mobile", () => {
    const css = read("src/styles.css");

    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-intro--supporting\s*\{[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-meta-copy\s*\{[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-header\s*\{[\s\S]*padding:\s*12px\s*12px\s*10px/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-meta\s*\{[\s\S]*display:\s*flex[\s\S]*justify-content:\s*space-between/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-meta-list\s*\{[\s\S]*display:\s*none/);
  });

  it("compacts the dashboard lead task and create forms without removing optional metadata access", () => {
    const contentCreate = read("src/views/admin/content/ContentCreateForm.vue");
    const uploadsCreate = read("src/views/admin/uploads/UploadsCreateForm.vue");
    const css = read("src/styles.css");

    for (const source of [contentCreate, uploadsCreate]) {
      expect(source).toMatch(/admin-optional-disclosure/);
      expect(source).toMatch(/admin-optional-summary/);
      expect(source).toMatch(/admin-optional-fields/);
    }

    expect(css).toMatch(/\.admin-optional-disclosure\s*\{/);
    expect(css).toMatch(/\.admin-optional-summary\s*\{/);
    expect(css).toMatch(/\.admin-optional-fields\s*\{/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-task-copy--supporting\s*\{[\s\S]*display:\s*none/);
  });

  it("removes redundant first-screen label rows on mobile so the next admin card appears sooner", () => {
    const css = read("src/styles.css");

    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-kicker\s*\{[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-meta-label\s*\{[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-copy\s*\{[\s\S]*gap:\s*4px/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-meta\s*\{[\s\S]*padding:\s*8px\s*10px/);
  });

  it("drops the extra admin context card entirely once shell and page headers already establish the current location", () => {
    const layout = read("src/views/admin/AdminLayoutView.vue");

    expect(layout).not.toMatch(/class="admin-context-card"/);
    expect(layout).not.toMatch(/\.admin-context-card\s*\{/);
  });

  it("compresses dashboard secondary cards and list headers on mobile without hiding actions or search", () => {
    const dashboard = read("src/views/admin/AdminDashboardView.vue");
    const contentView = read("src/views/admin/AdminContentView.vue");
    const uploadsView = read("src/views/admin/AdminUploadsView.vue");
    const contentList = read("src/views/admin/content/ContentListPanel.vue");
    const uploadsList = read("src/views/admin/uploads/UploadsListPanel.vue");

    expect(dashboard).toMatch(/admin-task-card--secondary/);
    expect(dashboard).toMatch(/admin-task-copy--secondary/);
    expect(contentList).toMatch(/class="list-heading"/);
    expect(uploadsList).toMatch(/class="list-heading"/);
    expect(dashboard).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-task-copy--secondary\s*\{[\s\S]*display:\s*none/);
    expect(contentView).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*:deep\(\.list-heading\)\s*\{[\s\S]*display:\s*none/);
    expect(uploadsView).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*:deep\(\.list-heading\)\s*\{[\s\S]*display:\s*none/);
  });

  it("extends the operational workspace language into secondary admin pages", () => {
    const content = read("src/views/admin/AdminContentView.vue");
    const libraryTemplate = read("src/views/admin/library/AdminLibraryView.template.html");
    const uploads = read("src/views/admin/AdminUploadsView.vue");
    const taxonomy = read("src/views/admin/AdminTaxonomyView.vue");
    const system = read("src/views/admin/AdminSystemView.vue");
    const account = read("src/views/admin/AdminAccountView.vue");

    for (const source of [content, libraryTemplate, uploads, taxonomy, system, account]) {
      expect(source).toMatch(/admin-page-header/);
      expect(source).toMatch(/admin-page-kicker/);
      expect(source).toMatch(/admin-page-meta/);
    }

    expect(content).toMatch(/admin-page-header--content/);
    expect(libraryTemplate).toMatch(/admin-page-header--library/);
    expect(uploads).toMatch(/admin-page-header--uploads/);
    expect(taxonomy).toMatch(/admin-page-header--taxonomy/);
    expect(system).toMatch(/admin-page-header--system/);
    expect(account).toMatch(/admin-page-header--account/);
  });

  it("reduces mobile admin framing to a compact shell title and lighter page context strip", () => {
    const header = read("src/components/admin/AdminShellHeader.vue");
    const css = read("src/styles.css");

    expect(header).toMatch(/admin-shell-title-mobile/);
    expect(header).toMatch(/currentAdminSection\.label/);
    expect(header).toMatch(/admin-shell-title-desktop/);
    expect(header).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-title-desktop\s*\{[\s\S]*display:\s*none/);
    expect(header).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-title-mobile\s*\{[\s\S]*display:\s*block/);
    expect(header).toMatch(/admin-shell-mobile-context/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-copy\s*\{[\s\S]*gap:\s*4px/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-copy\s*:is\(h1,\s*h2,\s*h3\)\s*\{[\s\S]*font-size:\s*clamp\(1\.26rem,\s*6vw,\s*1\.62rem\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-header\s*\{[\s\S]*padding:\s*12px\s*12px\s*10px/);
  });

  it("makes mobile list actions and system steps easier to operate without desktop-style wrapping", () => {
    const contentView = read("src/views/admin/AdminContentView.vue");
    const uploadsView = read("src/views/admin/AdminUploadsView.vue");
    const systemSteps = read("src/views/admin/system/SystemWizardSteps.vue");

    expect(contentView).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*:deep\(\.item-actions\)\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    expect(uploadsView).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*:deep\(\.item-actions\)\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    expect(systemSteps).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.step-list\s*\{[\s\S]*display:\s*grid[\s\S]*grid-auto-flow:\s*column[\s\S]*overflow-x:\s*auto/);
  });

  it("turns mobile edit panels into dismissible bottom sheets instead of stacking editors after the list", () => {
    const contentView = read("src/views/admin/AdminContentView.vue");
    const uploadsView = read("src/views/admin/AdminUploadsView.vue");
    const contentEdit = read("src/views/admin/content/ContentEditPanel.vue");
    const uploadsEdit = read("src/views/admin/uploads/UploadsEditPanel.vue");

    expect(contentView).toMatch(/class="editor-sheet-backdrop"/);
    expect(contentView).toMatch(/editor-panel--sheet/);
    expect(contentView).toMatch(/show-sheet-close/);
    expect(contentView).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.editor-panel--sheet\s*\{[\s\S]*position:\s*fixed[\s\S]*bottom:\s*0/);
    expect(contentView).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.editor-panel--sheet\.is-open\s*\{[\s\S]*transform:\s*translateY\(0\)/);

    expect(uploadsView).toMatch(/class="editor-sheet-backdrop"/);
    expect(uploadsView).toMatch(/editor-panel--sheet/);
    expect(uploadsView).toMatch(/show-sheet-close/);
    expect(uploadsView).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.editor-panel--sheet\s*\{[\s\S]*position:\s*fixed[\s\S]*bottom:\s*0/);

    expect(contentEdit).toMatch(/editor-close/);
    expect(contentEdit).toMatch(/close-edit/);
    expect(contentEdit).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.editor-footer\s*\{[\s\S]*position:\s*sticky[\s\S]*bottom:\s*0/);
    expect(uploadsEdit).toMatch(/editor-close/);
    expect(uploadsEdit).toMatch(/close-edit/);
  });

  it("turns mobile library and taxonomy management into low-noise sheets and action strips", () => {
    const library = read("src/views/admin/AdminLibraryView.vue");
    const libraryTemplate = read("src/views/admin/library/AdminLibraryView.template.html");
    const libraryCss = read("src/views/admin/library/AdminLibraryView.css");
    const taxonomy = read("src/views/admin/AdminTaxonomyView.vue");
    const taxonomyTree = read("src/views/admin/taxonomy/TaxonomyTreePanel.vue");
    const taxonomyGroup = read("src/views/admin/taxonomy/GroupEditorPanel.vue");
    const taxonomyCategory = read("src/views/admin/taxonomy/CategoryEditorPanel.vue");

    expect(libraryTemplate).toMatch(/class="library-mobile-taskbar admin-card"/);
    expect(libraryTemplate).toMatch(/class="library-mobile-primary-actions"/);
    expect(libraryTemplate).toMatch(/class="library-mobile-sheet-backdrop"/);
    expect(libraryTemplate).toMatch(/class="library-mobile-sheet-header"/);
    expect(libraryCss).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.library-mobile-primary-actions\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(libraryCss).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.library-mobile-sheet\s*\{[\s\S]*position:\s*fixed[\s\S]*bottom:\s*0/);
    expect(libraryCss).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.library-mobile-sheet\.is-open\s*\{[\s\S]*transform:\s*translateY\(0\)/);

    expect(taxonomy).toMatch(/class="taxonomy-mobile-actions admin-card"/);
    expect(taxonomy).toMatch(/class="taxonomy-editor-sheet-backdrop"/);
    expect(taxonomy).toMatch(/taxonomy-editor-sheet/);
    expect(taxonomyTree).toMatch(/class="tree-mobile-toolbar"/);
    expect(taxonomy).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.taxonomy-mobile-actions\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(taxonomy).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.taxonomy-editor-sheet\s*\{[\s\S]*position:\s*fixed[\s\S]*bottom:\s*0/);
    expect(taxonomy).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.taxonomy-editor-sheet\.is-open\s*\{[\s\S]*transform:\s*translateY\(0\)/);
    expect(taxonomyGroup).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.actions\s*\{[\s\S]*position:\s*sticky[\s\S]*bottom:\s*0/);
    expect(taxonomyCategory).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.actions\s*\{[\s\S]*position:\s*sticky[\s\S]*bottom:\s*0/);
  });

  it("collapses secondary library list tools on mobile so filters and recycle content stop crowding the first screen", () => {
    const library = read("src/views/admin/AdminLibraryView.vue");
    const libraryTemplate = read("src/views/admin/library/AdminLibraryView.template.html");
    const libraryCss = read("src/views/admin/library/AdminLibraryView.css");

    expect(library).toMatch(/mobileLibraryToolsOpen/);
    expect(library).toMatch(/toggleMobileLibraryTools/);
    expect(library).toMatch(/mobileDeletedAssetsOpen/);
    expect(library).toMatch(/toggleMobileDeletedAssets/);

    expect(libraryTemplate).toMatch(/library-mobile-tools/);
    expect(libraryTemplate).toMatch(/library-mobile-tools-toggle/);
    expect(libraryTemplate).toMatch(/library-mobile-tools-body/);
    expect(libraryTemplate).toMatch(/library-mobile-deleted-toggle/);
    expect(libraryTemplate).toMatch(/library-mobile-deleted-body/);

    expect(libraryCss).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.library-mobile-tools\s*\{[\s\S]*display:\s*grid/);
    expect(libraryCss).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.library-mobile-tools-body\s*\{[\s\S]*display:\s*none/);
    expect(libraryCss).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.library-mobile-tools-body\.is-open\s*\{[\s\S]*display:\s*grid/);
    expect(libraryCss).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.library-mobile-deleted-body\s*\{[\s\S]*display:\s*none/);
    expect(libraryCss).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.library-mobile-deleted-body\.is-open\s*\{[\s\S]*display:\s*grid/);
  });

  it("widens desktop admin work surfaces and compresses shell framing into a denser toolbar", () => {
    const app = read("src/App.vue");
    const foundation = read("src/styles/foundation.css");
    const topbar = read("src/styles/topbar.css");
    const header = read("src/components/admin/AdminShellHeader.vue");

    expect(app).toMatch(/app-main--admin/);
    expect(foundation).toMatch(/@media\s*\(min-width:\s*1280px\)\s*\{[\s\S]*\.app-main--admin\s*\{[\s\S]*width:\s*min\(1360px,\s*calc\(100%\s*-\s*64px\)\)/);
    expect(topbar).toMatch(/@media\s*\(min-width:\s*1280px\)\s*\{[\s\S]*\.topbar--admin\s+\.topbar-inner\s*\{[\s\S]*width:\s*min\(1360px,\s*calc\(100%\s*-\s*64px\)\)/);
    expect(header).toMatch(/@media\s*\(min-width:\s*960px\)\s*\{[\s\S]*\.admin-shell-header\s*\{[\s\S]*align-items:\s*center[\s\S]*padding:\s*12px\s*18px/);
    expect(header).toMatch(/@media\s*\(min-width:\s*960px\)\s*\{[\s\S]*\.admin-shell-description\s*\{[\s\S]*display:\s*none/);
    expect(header).toMatch(/@media\s*\(min-width:\s*960px\)\s*\{[\s\S]*\.admin-shell-status-strip\s*\{[\s\S]*display:\s*flex[\s\S]*align-items:\s*center/);
  });

  it("keeps desktop shell actions inside a wrapped toolbar instead of letting the home link drift to the edge", () => {
    const header = read("src/components/admin/AdminShellHeader.vue");

    expect(header).toMatch(/class="admin-shell-toolbar"/);
    expect(header).toMatch(/\.admin-shell-ops\s*\{[\s\S]*min-width:\s*0/);
    expect(header).toMatch(/\.admin-shell-toolbar\s*\{/);
    expect(header).toMatch(/\.admin-shell-toolbar\s*\{[\s\S]*display:\s*flex[\s\S]*flex-wrap:\s*wrap/);
    expect(header).toMatch(/@media\s*\(min-width:\s*960px\)\s*\{[\s\S]*\.admin-shell-toolbar\s*\{[\s\S]*justify-content:\s*flex-end/);
  });
});
