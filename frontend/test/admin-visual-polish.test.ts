import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin visual polish", () => {
  it("turns the dashboard into a task-oriented workspace", () => {
    const dashboard = read("src/views/admin/AdminDashboardView.vue");

    expect(dashboard).toMatch(/admin-task-grid/);
    expect(dashboard).toMatch(/admin-task-card/);
    expect(dashboard).toMatch(/admin-task-card--queue/);
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
    expect(source).toMatch(/\.admin-context-card\s*\{[\s\S]*position:\s*relative/);
    expect(source).toMatch(/\.admin-shell-status-strip\s*\{/);
    expect(source).toMatch(/\.admin-nav-group-summary\s*\{/);
    expect(source).toMatch(/\.admin-shell-header--compact\s*\{/);
  });

  it("adds motion when the mobile workspace menu opens", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/\.admin-nav-shell\s*\{[\s\S]*transition:/);
    expect(source).toMatch(/\.admin-nav-shell\.is-open\s*\{[\s\S]*animation:/);
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
  });
});
