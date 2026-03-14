import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("viewer action bar", () => {
  it("keeps action bar sticky below the shared topbar and pairs it with a staged presentation shell", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/class="viewer-stage-shell"/);
    expect(source).toMatch(/class="viewer-rail"/);
    expect(source).toMatch(/class="viewer-rail-state"/);
    expect(source).toMatch(/\.viewer-bar\s*\{[\s\S]*position:\s*sticky/);
    expect(source).toMatch(/\.viewer-bar\s*\{[\s\S]*top:\s*var\(--app-topbar-height,\s*0px\)/);
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

  it("moves preview hint copy into a side rail instead of the main action path", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/class="viewer-rail-note"/);
    expect(source).not.toMatch(/class="viewer-hint"/);
  });

  it("adds a visible mode chip and transition note inside the stage frame", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/const stageModeLabel = computed/);
    expect(source).toMatch(/const stageTransitionText = computed/);
    expect(source).toMatch(/class="viewer-mode-chip"/);
    expect(source).toMatch(/class="viewer-transition-note"/);
  });

  it("hides stale ready-state actions while the next viewer route is still loading", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/document\.title = "正在加载作品\.\.\."/);
    expect(source).toMatch(/v-if="!loading && model\?\.status === 'ready' && model\.showHint"/);
    expect(source).toMatch(/class="viewer-rail-state"/);
    expect(source).toMatch(/v-if="!loading && model\?\.status === 'ready' && model\.showModeToggle"/);
    expect(source).toMatch(/v-if="!loading && model\?\.status === 'ready'"/);
    expect(source).toMatch(/v-if="!loading && model\?\.status === 'ready' && modeStateText"/);
  });

  it("defers external iframe mounting until the user explicitly starts interaction", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/const interactiveStarted = ref\(true\)/);
    expect(source).toMatch(/interactiveStarted\.value = !next\.deferInteractiveStart/);
    expect(source).toMatch(/v-if="interactiveStarted"/);
    expect(source).toMatch(/尝试交互/);
  });

  it("keeps a close-interaction escape hatch for deferred external previews without screenshots", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/function stopInteractive\(/);
    expect(source).toMatch(/interactiveStarted\.value = false/);
    expect(source).toMatch(/关闭交互/);
  });

  it("tears down the iframe when switching external previews back to screenshot mode", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/function toggleMode\([\s\S]*if \(screenshotMode\.value\) \{[\s\S]*interactiveStarted\.value = true/);
    expect(source).toMatch(/function toggleMode\([\s\S]*else \{[\s\S]*interactiveStarted\.value = false/);
  });

  it("normalizes screenshot image src so relative content paths work under /viewer/:id", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/normalizePublicUrl/);
    expect(source).toMatch(/:src=\"normalizePublicUrl\(model\.screenshotUrl\)\"/);
  });

  it("defines purposeful stage animations with a reduced-motion fallback", () => {
    const source = read("src/views/ViewerView.vue");
    expect(source).toMatch(/@keyframes viewer-stage-glow/);
    expect(source).toMatch(/@keyframes viewer-stage-shift/);
    expect(source).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(source).toMatch(/\.viewer-stage-frame--transitioning/);
  });
});
