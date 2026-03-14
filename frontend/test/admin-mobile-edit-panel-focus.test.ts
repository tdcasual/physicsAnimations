import fs from "node:fs";
import path from "node:path";
import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminMobileEditPanelFocus } from "../src/views/admin/useAdminMobileEditPanelFocus";

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("admin mobile edit panel focus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("wires content and uploads edit actions through mobile focus helpers", () => {
    const contentView = read("src/views/admin/AdminContentView.vue");
    const uploadsView = read("src/views/admin/AdminUploadsView.vue");

    expect(contentView).toMatch(/createAdminMobileEditPanelFocus/);
    expect(contentView).toMatch(/openContentEditor/);
    expect(contentView).toMatch(/@begin-edit="openContentEditor"/);
    expect(contentView).toMatch(/ref="contentEditorPanelRef"/);

    expect(uploadsView).toMatch(/createAdminMobileEditPanelFocus/);
    expect(uploadsView).toMatch(/openUploadEditor/);
    expect(uploadsView).toMatch(/@begin-edit="openUploadEditor"/);
    expect(uploadsView).toMatch(/ref="uploadEditorPanelRef"/);
  });

  it("scrolls the edit panel into view on small screens", async () => {
    const panel = document.createElement("aside");
    const scrollIntoView = vi.fn();
    panel.scrollIntoView = scrollIntoView;

    vi.stubGlobal("window", {
      ...window,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    });

    const focus = createAdminMobileEditPanelFocus({
      panelRef: ref(panel),
    });

    const didScroll = await focus.focusEditPanel();

    expect(didScroll).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", inline: "nearest" });
  });

  it("does not auto-scroll on wide screens", async () => {
    const panel = document.createElement("aside");
    const scrollIntoView = vi.fn();
    panel.scrollIntoView = scrollIntoView;

    vi.stubGlobal("window", {
      ...window,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });

    const focus = createAdminMobileEditPanelFocus({
      panelRef: ref(panel),
    });

    const didScroll = await focus.focusEditPanel();

    expect(didScroll).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
