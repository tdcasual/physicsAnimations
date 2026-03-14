import fs from "node:fs";
import path from "node:path";
import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCatalogMobileFilterFocus } from "../src/views/useCatalogMobileFilterFocus";

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("catalog mobile filter focus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("wires CatalogView through the mobile filter focus helper", () => {
    const source = read("src/views/CatalogView.vue");

    expect(source).toMatch(/createCatalogMobileFilterFocus/);
    expect(source).toMatch(/mobileFilterTriggerRef/);
    expect(source).toMatch(/mobileFilterPanelRef/);
    expect(source).toMatch(/ref="mobileFilterTriggerRef"/);
    expect(source).toMatch(/ref="mobileFilterPanelRef"/);
    expect(source).toMatch(/watch\(mobileFiltersOpen/);
    expect(source).toMatch(/void focusFilterPanel\(\)/);
  });

  it("scrolls the mobile filter panel into view when it opens below the viewport", async () => {
    const panel = document.createElement("div");
    const trigger = document.createElement("button");
    const triggerScrollIntoView = vi.fn();
    const panelScrollIntoView = vi.fn();
    trigger.scrollIntoView = triggerScrollIntoView;
    panel.scrollIntoView = panelScrollIntoView;
    panel.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 860,
      width: 320,
      height: 240,
      top: 860,
      bottom: 1100,
      left: 0,
      right: 320,
      toJSON: () => ({}),
    } as DOMRect));

    vi.stubGlobal("window", {
      ...window,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
      innerHeight: 844,
    });

    const focus = createCatalogMobileFilterFocus({
      panelRef: ref(panel),
      triggerRef: ref(trigger),
    });

    const didScroll = await focus.focusFilterPanel();

    expect(didScroll).toBe(true);
    expect(triggerScrollIntoView).toHaveBeenCalledWith({ block: "start", inline: "nearest" });
    expect(panelScrollIntoView).not.toHaveBeenCalled();
  });

  it("does not scroll when the panel is already visible", async () => {
    const panel = document.createElement("div");
    const trigger = document.createElement("button");
    const triggerScrollIntoView = vi.fn();
    const panelScrollIntoView = vi.fn();
    trigger.scrollIntoView = triggerScrollIntoView;
    panel.scrollIntoView = panelScrollIntoView;
    panel.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 120,
      width: 320,
      height: 240,
      top: 120,
      bottom: 360,
      left: 0,
      right: 320,
      toJSON: () => ({}),
    } as DOMRect));

    vi.stubGlobal("window", {
      ...window,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
      innerHeight: 844,
    });

    const focus = createCatalogMobileFilterFocus({
      panelRef: ref(panel),
      triggerRef: ref(trigger),
    });

    const didScroll = await focus.focusFilterPanel();

    expect(didScroll).toBe(false);
    expect(triggerScrollIntoView).not.toHaveBeenCalled();
    expect(panelScrollIntoView).not.toHaveBeenCalled();
  });
});
