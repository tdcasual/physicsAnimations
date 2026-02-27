import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin style semantics", () => {
  it("defines shared admin semantic classes in global styles", () => {
    const css = read("src/styles.css");
    expect(css).toMatch(/\.admin-card\s*\{/);
    expect(css).toMatch(/\.admin-field\s*\{/);
    expect(css).toMatch(/\.admin-input\s*\{/);
    expect(css).toMatch(/\.admin-actions\s*\{/);
    expect(css).toMatch(/\.admin-feedback\s*\{/);
    expect(css).toMatch(/\.btn-danger\s*\{/);
  });

  it("applies shared classes in core admin views", () => {
    const content = read("src/views/admin/AdminContentView.vue");
    const uploads = read("src/views/admin/AdminUploadsView.vue");
    const taxonomy = read("src/views/admin/AdminTaxonomyView.vue");
    const system = read("src/views/admin/AdminSystemView.vue");

    for (const source of [content, uploads, taxonomy, system]) {
      expect(source).toMatch(/admin-card/);
      expect(source).toMatch(/admin-actions/);
    }

    expect(content).toMatch(/admin-feedback/);
    expect(uploads).toMatch(/admin-feedback/);
    expect(taxonomy).toMatch(/admin-feedback/);
    expect(system).toMatch(/admin-feedback/);

    expect(content).not.toMatch(/\.btn-danger\s*\{/);
    expect(uploads).not.toMatch(/\.btn-danger\s*\{/);
  });

  it("avoids redefining shared base form/button styles in admin pages", () => {
    const account = read("src/views/admin/AdminAccountView.vue");
    const dashboard = read("src/views/admin/AdminDashboardView.vue");
    const content = read("src/views/admin/AdminContentView.vue");
    const uploads = read("src/views/admin/AdminUploadsView.vue");
    const taxonomy = read("src/views/admin/AdminTaxonomyView.vue");
    const system = read("src/views/admin/AdminSystemView.vue");

    for (const source of [account, dashboard, content, uploads, taxonomy, system]) {
      expect(source).not.toMatch(/\.btn\s*\{/);
    }

    for (const source of [account, content, uploads, taxonomy, system]) {
      expect(source).not.toMatch(/\.field\s*\{/);
      expect(source).not.toMatch(/\.field-input\s*\{/);
    }
  });
});
