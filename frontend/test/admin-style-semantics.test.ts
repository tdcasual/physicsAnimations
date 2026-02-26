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
  });
});
