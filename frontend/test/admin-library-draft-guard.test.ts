import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin library draft guard", () => {
  it("adds a shared pending-changes guard to the library admin state wiring", () => {
    const source = read("src/features/library/useLibraryAdminActionWiring.ts");

    expect(source).toMatch(/import\s+\{\s*computed,\s*watch,\s*type\s+Ref\s*\}\s+from\s+"vue"/);
    expect(source).toMatch(/import\s+\{\s*usePendingChangesGuard\s*\}\s+from\s+"\.\.\/admin\/composables\/usePendingChangesGuard"/);
    expect(source).toMatch(/const\s+hasPendingChanges\s*=\s*computed\(/);
    expect(source).toMatch(/usePendingChangesGuard\(\{[\s\S]*hasPendingChanges[\s\S]*isBlocked:\s*computed\(\(\)\s*=>\s*savingFolder\.value\s*\|\|\s*savingAsset\.value\s*\|\|\s*savingEmbed\.value\)[\s\S]*message:\s*"资源库内容有未保存更改，确定离开当前页面吗？"/);
  });

  it("confirms before switching folders when the current library context would overwrite drafts", () => {
    const wiring = read("src/features/library/useLibraryAdminActionWiring.ts");
    const template = read("src/views/admin/library/AdminLibraryView.template.html");

    expect(wiring).toMatch(/function\s+confirmDiscardPendingChanges\(message\s*=\s*"资源库中有未保存更改，确定继续吗？"\)/);
    expect(wiring).toMatch(/const\s+hasPendingFolderSwitchChanges\s*=\s*computed\(/);
    expect(wiring).toMatch(/function\s+selectFolder\(folderId:\s*string,\s*options:\s*\{\s*panelTab\?:\s*LibraryPanelTab\s*\}\s*=\s*\{\s*\}\)/);
    expect(wiring).toMatch(/if\s*\(folderId === draft\.selectedFolderId\.value\)\s*\{[\s\S]*options\.panelTab/);
    expect(wiring).toMatch(/if\s*\(!confirmDiscardPendingChanges\("当前资源库编辑内容有未保存更改，确定切换文件夹吗？"\)\)\s*return/);
    expect(wiring).toMatch(/draft\.selectedFolderId\.value\s*=\s*folderId/);

    expect(template).toMatch(/@click="vm\.actions\.selectFolder\(folder\.id\)"/);
    expect(template).toMatch(/@click="vm\.actions\.selectFolder\(folder\.id,\s*\{\s*panelTab:\s*'folder'\s*\}\)"/);
    expect(template).not.toMatch(/@click="vm\.data\.selectedFolderId = folder\.id"/);
  });

  it("confirms before replacing asset or embed edit drafts with another record", () => {
    const wiring = read("src/features/library/useLibraryAdminActionWiring.ts");

    expect(wiring).toMatch(/const\s+hasPendingAssetEditChanges\s*=\s*computed\(/);
    expect(wiring).toMatch(/const\s+hasPendingEmbedEditChanges\s*=\s*computed\(/);
    expect(wiring).toMatch(/function\s+startEditAsset\(asset:\s*LibraryAsset\)\s*\{[\s\S]*if\s*\(asset\.id !== draft\.editingAssetId\.value && hasPendingAssetEditChanges\.value\)[\s\S]*confirmDiscardPendingChanges\("当前资源编辑有未保存更改，确定切换吗？"\)/);
    expect(wiring).toMatch(/function\s+startEditEmbedProfile\(profile:\s*LibraryEmbedProfile\)\s*\{[\s\S]*if\s*\(profile\.id !== draft\.editingEmbedProfileId\.value && hasPendingEmbedEditChanges\.value\)[\s\S]*confirmDiscardPendingChanges\("当前 Embed 平台编辑有未保存更改，确定切换吗？"\)/);
  });
});
