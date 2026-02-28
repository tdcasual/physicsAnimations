import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("viewer action bar", () => {
  it("keeps action bar sticky and exposes mode state text", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/class="viewer-mode-state"/);
    expect(source).toMatch(/\.viewer-bar\s*\{[\s\S]*position:\s*sticky/);
    expect(source).toMatch(/\.viewer-bar\s*\{[\s\S]*top:\s*0/);
  });

  it("ignores stale async viewer refresh responses after route changes", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/const refreshSeq = ref\(0\)/);
    expect(source).toMatch(/const requestSeq = refreshSeq\.value \+ 1/);
    expect(source).toMatch(/refreshSeq\.value = requestSeq/);
    expect(source).toMatch(/if \(requestSeq !== refreshSeq\.value\) return/);
    expect(source).toMatch(/if \(requestSeq === refreshSeq\.value\) \{/);
  });

  it("wraps long titles in viewer header to avoid mobile overflow", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/\.viewer-title\s*\{[\s\S]*overflow-wrap:\s*anywhere/);
    expect(source).toMatch(/\.viewer-title\s*\{[\s\S]*word-break:\s*break-word/);
    expect(source).toMatch(/\.viewer-title\s*\{[\s\S]*min-width:\s*0/);
  });
});
