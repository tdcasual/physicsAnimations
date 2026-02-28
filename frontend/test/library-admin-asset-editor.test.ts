import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("library admin asset editor composable split", () => {
  it("moves edit flow actions into useLibraryAssetEditorActions", () => {
    const state = read("src/features/library/useLibraryAdminState.ts");
    const editor = read("src/features/library/useLibraryAssetEditorActions.ts");

    expect(state).not.toMatch(/function startEditAsset/);
    expect(state).not.toMatch(/async function saveAssetEdit/);
    expect(state).not.toMatch(/async function renameAssetDisplayName/);
    expect(state).toMatch(/useLibraryAssetEditorActions/);

    expect(editor).toMatch(/export function useLibraryAssetEditorActions/);
    expect(editor).toMatch(/function cancelAssetEdit/);
    expect(editor).toMatch(/function startEditAsset/);
    expect(editor).toMatch(/async function saveAssetEdit/);
    expect(editor).toMatch(/async function renameAssetDisplayName/);
  });
});
