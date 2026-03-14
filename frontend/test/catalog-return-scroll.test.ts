import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearCatalogReturnScroll,
  parseCatalogReturnScroll,
  readCatalogReturnScroll,
  resolveCatalogReturnScrollRestore,
  serializeCatalogReturnScroll,
  writeCatalogReturnScroll,
} from "../src/features/catalog/catalogReturnScroll";

function readSource(relativePath: string) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

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

  it("wires CatalogView through one-shot save and restore hooks", () => {
    const source = readSource("src/views/CatalogView.vue");

    expect(source).toMatch(/onBeforeRouteLeave/);
    expect(source).toMatch(/writeCatalogReturnScroll/);
    expect(source).toMatch(/resolveCatalogReturnScrollRestore/);
    expect(source).toMatch(/window\.scrollTo\(/);
  });
});
