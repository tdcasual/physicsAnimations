import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("viewer screenshot layout", () => {
  it("takes the iframe out of layout when screenshot preview is active", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");
    expect(source).toMatch(/class="viewer-stage-shell"/);
    expect(source).toMatch(/viewer-stage-shell--screenshot': props\.screenshotVisible/);
    expect(source).toMatch(/viewer-stage-shell--interactive': props\.interactiveStarted && !props\.screenshotVisible/);
    expect(source).toMatch(/class="viewer-stage-frame(?: [^"]+)?"/);
    expect(source).toMatch(/class="viewer-stage-aura"/);
    expect(source).toMatch(/class="viewer-stage-veil"/);
    expect(source).toMatch(/v-show="!props\.screenshotVisible"/);
  });

  it("lets the screenshot image define the stage height in screenshot mode", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");
    expect(source).toMatch(/\.viewer-stage-frame--screenshot \.viewer-shot\s*\{[\s\S]*position:\s*static/);
    expect(source).toMatch(/\.viewer-stage-frame--screenshot \.viewer-shot\s*\{[\s\S]*height:\s*auto/);
    expect(source).toMatch(/\.viewer-stage-frame--screenshot \.viewer-stage-veil\s*\{[\s\S]*opacity:\s*1/);
  });

  it("keeps the stage shell single-column so the screen stays primary across breakpoints", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");

    expect(source).toMatch(/\.viewer-stage-shell\s*\{[\s\S]*display:\s*grid/);
    expect(source).not.toMatch(/class="viewer-stage-column"/);
    expect(source).not.toMatch(/class="viewer-rail"/);
  });

  it("uses one compact status band above the stage and trims shell spacing on phones", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");

    expect(source).toMatch(/class="viewer-stage-status-band"/);
    expect(source).toMatch(/class="viewer-stage-frame viewer-stage-frame--priority"/);
    expect(source).toMatch(/@media \(max-width: 640px\)\s*\{[\s\S]*\.viewer-stage-proscenium\s*\{[\s\S]*padding:\s*6px/);
    expect(source).toMatch(/@media \(max-width: 640px\)\s*\{[\s\S]*\.viewer-stage-proscenium\s*\{[\s\S]*gap:\s*10px/);
    expect(source).toMatch(/@media \(max-width: 640px\)\s*\{[\s\S]*\.viewer-stage-status-band\s*\{[\s\S]*padding:\s*8px 10px/);
  });
});
