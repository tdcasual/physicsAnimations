import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("ui interaction guardrails", () => {
  it("clears login credentials on modal close and supports keyboard dismissal", () => {
    const source = readFile("src/App.vue");
    expect(source).toMatch(
      /function closeLogin\(\)\s*\{[\s\S]*loginUsername\.value\s*=\s*""[\s\S]*loginPassword\.value\s*=\s*""/,
    );
    expect(source).toMatch(/key\s*===\s*"Escape"/);
    expect(source).toMatch(/key\s*!==\s*"Tab"/);
  });

  it("prevents stale list request results from overriding newer queries", () => {
    const contentSource = readFile("src/views/admin/AdminContentView.vue");
    const uploadsSource = readFile("src/views/admin/AdminUploadsView.vue");

    for (const source of [contentSource, uploadsSource]) {
      expect(source).not.toMatch(/if\s*\(loading\.value\)\s*return;/);
      expect(source).toMatch(/latestReloadSeq/);
      expect(source).toMatch(/if\s*\(requestSeq\s*!==\s*latestReloadSeq\)\s*return;/);
    }
  });

  it("guards screenshot overlay timer against mode switches", () => {
    const source = readFile("src/views/ViewerView.vue");
    expect(source).toMatch(/clearHideScreenshotTimer/);
    expect(source).toMatch(/if\s*\(!screenshotMode\.value\)\s*\{[\s\S]*screenshotVisible\.value\s*=\s*false/);
  });

  it("requires explicit confirmation before uploading risky html", () => {
    const uploadsSource = readFile("src/views/admin/AdminUploadsView.vue");
    expect(uploadsSource).toMatch(/risky_html_requires_confirmation/);
    expect(uploadsSource).toMatch(/window\.confirm\(/);
    expect(uploadsSource).toMatch(/allowRiskyHtml:\s*true/);
  });
});
