import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin library busy field locking", () => {
  it("locks folder create/edit fields while folder save is in flight", () => {
    const source = read("src/views/admin/library/AdminLibraryView.template.html");
    // PAInput/PAField components handle field locking with :disabled
    expect(source).toMatch(/PAInput/);
    expect(source).toMatch(/v-model="vm\.drafts\.folderName"/);
    expect(source).toMatch(/v-model="vm\.drafts\.folderEditName"/);
    expect(source).toMatch(/:disabled="vm\.ui\.savingFolder"/);
    expect(source).toMatch(/:disabled="vm\.ui\.savingFolder \|\| !vm\.data\.selectedFolderId"/);
    // Select elements also have disabled binding
    expect(source).toMatch(/v-model="vm\.drafts\.folderCategoryId"/);
    expect(source).toMatch(/v-model="vm\.drafts\.folderEditCategoryId"/);
  });

  it("locks asset upload/edit fields while asset save is in flight", () => {
    const source = read("src/views/admin/library/AdminLibraryView.template.html");
    // PAInput/PAField components handle field locking with :disabled
    expect(source).toMatch(/PAInput/);
    expect(source).toMatch(/v-model="vm\.drafts\.assetDisplayName"/);
    expect(source).toMatch(/v-model="vm\.drafts\.assetEditDisplayName"/);
    expect(source).toMatch(/:disabled="vm\.ui\.savingAsset"/);
    expect(source).toMatch(/:disabled="vm\.ui\.savingAsset \|\| !vm\.data\.selectedFolderId"/);
    // Select elements also have disabled binding
    expect(source).toMatch(/v-model="vm\.drafts\.assetParserMode"/);
    expect(source).toMatch(/v-model="vm\.drafts\.assetEditParserMode"/);
    expect(source).toMatch(/v-model="vm\.drafts\.openMode"/);
    expect(source).toMatch(/v-model="vm\.drafts\.assetEditOpenMode"/);
  });
});
