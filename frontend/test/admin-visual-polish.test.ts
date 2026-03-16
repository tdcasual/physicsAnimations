import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
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
    expect(dashboard).toMatch(/admin-task-copy--supporting/);
    expect(dashboard).toMatch(/admin-task-card--secondary/);
    expect(dashboard).toMatch(/admin-task-copy--secondary/);
    expect(dashboard).toMatch(/admin-signal-card--metric/);
    expect(dashboard).toMatch(/下一步/);
    expect(dashboard).toMatch(/今日工作台/);
  });

  it("adds framed workspace surfaces and nav hover feedback", () => {
    const source = [
      read("src/views/admin/AdminLayoutView.vue"),
      read("src/components/admin/AdminShellHeader.vue"),
    ].join("\n");

    expect(source).toMatch(/admin-nav-shell::before/);
    expect(source).toMatch(/\.admin-link:hover\s*\{/);
    expect(source).toMatch(/\.admin-shell-status-strip\s*\{/);
    expect(source).toMatch(/\.admin-nav-group-summary\s*\{/);
    expect(source).toMatch(/\.admin-shell-header--compact\s*\{/);
    expect(source).toMatch(/\.admin-layout-view--workspace\s*\{/);
    expect(source).toMatch(/\.admin-layout-view--library\s*\{/);
    expect(source).toMatch(/\.admin-layout-view--system\s*\{/);
    expect(source).toMatch(/\.admin-shell-ops\s*\{/);
    expect(source).toMatch(/\.admin-shell-pulse\s*\{/);
  });

  it("adds motion when the mobile workspace menu opens", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/\.admin-nav-shell\s*\{[\s\S]*transition:/);
    expect(source).toMatch(/\.admin-nav-shell\.is-open\s*\{[\s\S]*animation:/);
  });

  it("compresses repeated admin shell copy on mobile instead of stacking full desktop framing", () => {
    const source = [read("src/views/admin/AdminLayoutView.vue"), read("src/components/admin/AdminShellHeader.vue")].join("\n");

    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-description\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-note\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-status-copy\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-kicker\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-summary-row\s*\{[\s\S]*display:\s*none/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-copy\s*\{[\s\S]*flex:\s*initial/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-header\s*\{[\s\S]*padding:\s*12px\s*14px/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-ops\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-status-strip\s*\{[\s\S]*display:\s*flex[\s\S]*align-items:\s*center[\s\S]*padding:\s*6px\s*9px/);
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-shell-status-label\s*\{[\s\S]*display:\s*none/);
  });

  it("treats dashboard, content, and uploads headers as compact operational framing on mobile", () => {
    const dashboard = read("src/views/admin/AdminDashboardView.vue");
    const content = read("src/views/admin/AdminContentView.vue");
    const uploads = read("src/views/admin/AdminUploadsView.vue");
    const css = read("src/styles.css");

    for (const source of [dashboard, content, uploads]) {
      expect(source).toMatch(/admin-page-intro--supporting/);
      expect(source).toMatch(/admin-page-meta-copy/);
    }

    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-intro--supporting\s*\{[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-meta-copy\s*\{[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-header\s*\{[\s\S]*padding:/);
  });

  it("compacts the dashboard lead task and create forms without removing optional metadata access", () => {
    const dashboard = read("src/views/admin/AdminDashboardView.vue");
    const contentCreate = read("src/views/admin/content/ContentCreateForm.vue");
    const uploadsCreate = read("src/views/admin/uploads/UploadsCreateForm.vue");
    const css = read("src/styles.css");

    expect(dashboard).toMatch(/admin-task-copy--supporting/);

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
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-copy\s*\{[\s\S]*gap:\s*2px/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-page-meta\s*\{[\s\S]*padding:\s*7px\s*10px/);
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
});
