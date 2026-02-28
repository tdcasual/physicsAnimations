import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("library admin asset CRUD composable split", () => {
  it("moves upload and asset lifecycle actions into useLibraryAssetCrudActions", () => {
    const state = read("src/features/library/useLibraryAdminState.ts");
    const crud = read("src/features/library/useLibraryAssetCrudActions.ts");

    expect(state).not.toMatch(/async function uploadAssetEntry/);
    expect(state).not.toMatch(/async function switchAssetOpenMode/);
    expect(state).not.toMatch(/async function restoreDeletedAsset/);
    expect(state).not.toMatch(/async function removeDeletedAssetPermanently/);
    expect(state).toMatch(/useLibraryAssetCrudActions/);

    expect(crud).toMatch(/export function useLibraryAssetCrudActions/);
    expect(crud).toMatch(/async function uploadAssetEntry/);
    expect(crud).toMatch(/async function switchAssetOpenMode/);
    expect(crud).toMatch(/async function restoreDeletedAsset/);
    expect(crud).toMatch(/async function removeDeletedAssetPermanently/);
  });
});
