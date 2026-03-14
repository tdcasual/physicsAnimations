import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("viewer screenshot layout", () => {
  it("takes the iframe out of layout when screenshot preview is active", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(
      /:class="\['viewer-stage-shell', \{ 'viewer-stage-shell--screenshot': screenshotVisible, 'viewer-stage-shell--interactive': interactiveStarted && !screenshotVisible \}\]"/,
    );
    expect(source).toMatch(/class="viewer-stage-frame"/);
    expect(source).toMatch(/class="viewer-stage-aura"/);
    expect(source).toMatch(/class="viewer-stage-veil"/);
    expect(source).toMatch(/v-show="!screenshotVisible"/);
  });

  it("lets the screenshot image define the stage height in screenshot mode", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/\.viewer-stage-frame--screenshot \.viewer-shot\s*\{[\s\S]*position:\s*static/);
    expect(source).toMatch(/\.viewer-stage-frame--screenshot \.viewer-shot\s*\{[\s\S]*height:\s*auto/);
    expect(source).toMatch(/\.viewer-stage-frame--screenshot \.viewer-stage-veil\s*\{[\s\S]*opacity:\s*1/);
  });
});
