import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearCatalogReturnScroll,
  parseCatalogReturnScroll,
  readCatalogReturnScroll,
  resolveCatalogReturnScrollRestore,
  serializeCatalogReturnScroll,
  writeCatalogReturnScroll,
} from "../src/features/catalog/catalogReturnScroll";
import { mountCatalogViewChromeHarness } from "./helpers/catalogViewChromeHarness";

describe("catalog return scroll", () => {
  afterEach(() => {
    clearCatalogReturnScroll();
  });

  it("round-trips one-shot return scroll snapshots", () => {
    const raw = serializeCatalogReturnScroll({
      catalogFullPath: "/#catalog-library",
      destinationPath: "/viewer/demo",
      scrollY: 1933,
      timestamp: 1700000000000,
    });

    expect(parseCatalogReturnScroll(raw)).toEqual({
      catalogFullPath: "/#catalog-library",
      destinationPath: "/viewer/demo",
      scrollY: 1933,
      timestamp: 1700000000000,
    });
  });

  it("persists and reads exact catalog return scroll context", () => {
    writeCatalogReturnScroll({
      catalogFullPath: "/",
      destinationPath: "/viewer/demo",
      scrollY: 1800,
      timestamp: 1700000000000,
    });

    expect(readCatalogReturnScroll()).toEqual({
      catalogFullPath: "/",
      destinationPath: "/viewer/demo",
      scrollY: 1800,
      timestamp: 1700000000000,
    });
  });

  it("restores only for fresh history returns to the same catalog entry", () => {
    const snapshot = {
      catalogFullPath: "/#catalog-library",
      destinationPath: "/library/folder/f_1",
      scrollY: 1933,
      timestamp: 1700000000000,
    };

    expect(
      resolveCatalogReturnScrollRestore({
        snapshot,
        currentFullPath: "/#catalog-library",
        historyState: { forward: "/library/folder/f_1" },
        now: 1700000000500,
      }),
    ).toEqual(snapshot);

    expect(
      resolveCatalogReturnScrollRestore({
        snapshot,
        currentFullPath: "/",
        historyState: { forward: "/library/folder/f_1" },
        now: 1700000000500,
      }),
    ).toBeNull();

    expect(
      resolveCatalogReturnScrollRestore({
        snapshot,
        currentFullPath: "/#catalog-library",
        historyState: { forward: "/viewer/other" },
        now: 1700000000500,
      }),
    ).toBeNull();

    expect(
      resolveCatalogReturnScrollRestore({
        snapshot,
        currentFullPath: "/#catalog-library",
        historyState: { forward: "/library/folder/f_1" },
        now: 1700000600000,
      }),
    ).toBeNull();
  });

  it("saves a one-shot return-scroll snapshot when leaving catalog and restores it when returning", async () => {
    Object.defineProperty(window, "scrollY", { value: 1800, configurable: true });

    const leavingHarness = await mountCatalogViewChromeHarness({ initialPath: "/" });
    await leavingHarness.router.push("/viewer/demo");

    expect(readCatalogReturnScroll()).toEqual({
      catalogFullPath: "/",
      destinationPath: "/viewer/demo",
      scrollY: 1800,
      timestamp: expect.any(Number),
    });

    leavingHarness.cleanup();

    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", { value: scrollTo, configurable: true });
    Object.defineProperty(window.history, "state", {
      value: { forward: "/viewer/demo" },
      configurable: true,
    });

    const restoringHarness = await mountCatalogViewChromeHarness({ initialPath: "/", loading: true });
    restoringHarness.loading.value = false;
    await nextTick();
    await nextTick();

    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 1800 });

    restoringHarness.cleanup();
  });
});
