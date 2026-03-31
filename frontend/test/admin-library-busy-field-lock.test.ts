import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('admin library busy field locking', () => {
  it('locks folder create/edit fields while folder save is in flight', () => {
    const source = read('src/views/admin/library/AdminLibraryView.template.html')
    expect(source).toMatch(
      /<input(?:(?!\/>)[\s\S])*v-model="vm\.drafts\.folderName"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingFolder"(?:(?!\/>)[\s\S])*\/>/
    )
    expect(source).toMatch(
      /<select(?:(?!>)[\s\S])*v-model="vm\.drafts\.folderCategoryId"(?:(?!>)[\s\S])*:disabled="vm\.ui\.savingFolder"(?:(?!>)[\s\S])*>/
    )
    expect(source).toMatch(
      /<input(?:(?!\/>)[\s\S])*id="library-create-cover-file"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingFolder"(?:(?!\/>)[\s\S])*\/>/
    )
    expect(source).toMatch(
      /<input(?:(?!\/>)[\s\S])*v-model="vm\.drafts\.folderEditName"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingFolder \|\| !vm\.data\.selectedFolderId"(?:(?!\/>)[\s\S])*\/>/
    )
    expect(source).toMatch(
      /<select(?:(?!>)[\s\S])*v-model="vm\.drafts\.folderEditCategoryId"(?:(?!>)[\s\S])*:disabled="vm\.ui\.savingFolder \|\| !vm\.data\.selectedFolderId"(?:(?!>)[\s\S])*>/
    )
    expect(source).toMatch(
      /<input(?:(?!\/>)[\s\S])*id="library-cover-file"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingFolder \|\| !vm\.data\.selectedFolderId"(?:(?!\/>)[\s\S])*\/>/
    )
  })

  it('locks asset upload/edit fields while asset save is in flight', () => {
    const source = read('src/views/admin/library/AdminLibraryView.template.html')
    expect(source).toMatch(
      /<input(?:(?!\/>)[\s\S])*id="library-asset-file"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingAsset \|\| !vm\.data\.selectedFolderId"(?:(?!\/>)[\s\S])*\/>/
    )
    expect(source).toMatch(
      /<input(?:(?!\/>)[\s\S])*v-model="vm\.drafts\.assetDisplayName"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingAsset \|\| !vm\.data\.selectedFolderId"(?:(?!\/>)[\s\S])*\/>/
    )
    expect(source).toMatch(
      /<select(?:(?!>)[\s\S])*v-model="vm\.drafts\.assetParserMode"(?:(?!>)[\s\S])*:disabled="vm\.ui\.savingAsset \|\| !vm\.data\.selectedFolderId"(?:(?!>)[\s\S])*>/
    )
    expect(source).toMatch(
      /<select(?:(?!>)[\s\S])*v-model="vm\.drafts\.openMode"(?:(?!>)[\s\S])*:disabled="vm\.ui\.savingAsset \|\| !vm\.data\.selectedFolderId"(?:(?!>)[\s\S])*>/
    )
    expect(source).toMatch(
      /<input(?:(?!\/>)[\s\S])*v-model="vm\.drafts\.assetEditDisplayName"(?:(?!\/>)[\s\S])*:disabled="vm\.ui\.savingAsset"(?:(?!\/>)[\s\S])*\/>/
    )
    expect(source).toMatch(
      /<select(?:(?!>)[\s\S])*v-model="vm\.drafts\.assetEditFolderId"(?:(?!>)[\s\S])*:disabled="vm\.ui\.savingAsset"(?:(?!>)[\s\S])*>/
    )
    expect(source).toMatch(
      /<select(?:(?!>)[\s\S])*v-model="vm\.drafts\.assetEditParserMode"(?:(?!>)[\s\S])*:disabled="vm\.ui\.savingAsset"(?:(?!>)[\s\S])*>/
    )
    expect(source).toMatch(
      /<select(?:(?!>)[\s\S])*v-model="vm\.drafts\.assetEditOpenMode"(?:(?!>)[\s\S])*:disabled="vm\.ui\.savingAsset"(?:(?!>)[\s\S])*>/
    )
  })
})
