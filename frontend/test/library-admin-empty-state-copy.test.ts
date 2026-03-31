import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('library admin empty state copy', () => {
  it('distinguishes folder search misses from a truly empty folder list', () => {
    const view = read('src/views/admin/AdminLibraryView.vue')
    const template = read('src/views/admin/library/AdminLibraryView.template.html')
    expect(view).toMatch(/function folderListEmptyText\(\): string \{/)
    expect(view).toMatch(
      /vm\.filters\.folderSearchQuery\.trim\(\)\s*\?\s*['"]暂无匹配文件夹。['"]\s*:\s*['"]暂无文件夹。['"]/
    )
    expect(template).toMatch(/\{\{ folderListEmptyText\(\) \}\}/)
  })

  it('distinguishes empty folders from filtered asset misses', () => {
    const view = read('src/views/admin/AdminLibraryView.vue')
    const template = read('src/views/admin/library/AdminLibraryView.template.html')
    expect(view).toMatch(/function selectedFolderAssetsEmptyText\(\): string \{/)
    expect(view).toMatch(/vm\.filters\.assetSearchQuery\.trim\(\)/)
    expect(view).toMatch(/vm\.filters\.assetModeFilter\s*!==\s*['"]all['"]/)
    expect(view).toMatch(/vm\.filters\.assetEmbedProfileFilter\s*!==\s*['"]all['"]/)
    expect(view).toMatch(/\?\s*['"]该文件夹暂无匹配资源。['"]\s*:\s*['"]该文件夹暂无资源。['"]/)
    expect(template).toMatch(/\{\{ selectedFolderAssetsEmptyText\(\) \}\}/)
  })

  it('distinguishes embed profile search misses from a truly empty profile list', () => {
    const view = read('src/views/admin/AdminLibraryView.vue')
    const template = read('src/views/admin/library/AdminLibraryView.template.html')
    expect(view).toMatch(/function embedProfilesEmptyText\(\): string \{/)
    expect(view).toMatch(
      /vm\.filters\.profileSearchQuery\.trim\(\)\s*\?\s*['"]暂无匹配 Embed 平台。['"]\s*:\s*['"]暂无 Embed 平台。['"]/
    )
    expect(template).toMatch(/\{\{ embedProfilesEmptyText\(\) \}\}/)
  })
})
