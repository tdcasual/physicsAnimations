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
    expect(source).toMatch(/v-show="!props\.screenshotVisible"/);
  });

  it("lets the screenshot image define the stage height in screenshot mode", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");
    expect(source).toMatch(/\.viewer-stage-frame--screenshot \.viewer-shot\s*\{[\s\S]*position:\s*static/);
    expect(source).toMatch(/\.viewer-stage-frame--screenshot \.viewer-shot\s*\{[\s\S]*height:\s*auto/);
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

  it("uses a compact stage frame with tighter spacing on phones", () => {
    const source = [
      read("src/views/ViewerView.vue"),
      read("src/components/viewer/ViewerStageShell.vue"),
    ].join("\n");

    expect(source).toMatch(/class="viewer-stage-frame viewer-stage-frame--priority"/);
    expect(source).toMatch(/@media \(max-width: 640px\)\s*\{[\s\S]*\.viewer-stage-frame--priority\s*\{[\s\S]*padding:\s*10px/);
  });
});
