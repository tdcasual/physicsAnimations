import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('admin pending changes route guard', () => {
  it('extracts shared beforeunload and route-leave prompts into a reusable composable', () => {
    const source = read('src/features/admin/composables/usePendingChangesGuard.ts')

    expect(source).toMatch(/export\s+function\s+usePendingChangesGuard\(/)
    expect(source).toMatch(/onBeforeRouteLeave\(\(\)\s*=>\s*\{/)
    expect(source).toMatch(/window\.confirm\(message\)/)
    expect(source).toMatch(/window\.addEventListener\(['"]beforeunload['"],\s*handleBeforeUnload\)/)
    expect(source).toMatch(
      /window\.removeEventListener\(['"]beforeunload['"],\s*handleBeforeUnload\)/
    )
  })

  it('wires the shared guard into mutable admin views with page-specific messages', () => {
    const content = read('src/features/admin/content/useContentAdmin.ts')
    const uploads = read('src/features/admin/uploads/useUploadAdmin.ts')
    const taxonomy = read('src/features/admin/taxonomy/useTaxonomyAdmin.ts')
    const account = read('src/views/admin/AdminAccountView.vue')
    const library = read('src/features/library/useLibraryAdminActionWiring.ts')

    expect(content).toMatch(
      /usePendingChangesGuard\(\{[\s\S]*hasPendingChanges:\s*hasPendingEditChanges[\s\S]*isBlocked:\s*saving[\s\S]*message:\s*['"]当前编辑内容有未保存更改，确定离开当前页面吗？['"]/
    )
    expect(uploads).toMatch(
      /usePendingChangesGuard\(\{[\s\S]*hasPendingChanges:\s*hasPendingEditChanges[\s\S]*isBlocked:\s*saving[\s\S]*message:\s*['"]当前编辑内容有未保存更改，确定离开当前页面吗？['"]/
    )
    expect(taxonomy).toMatch(
      /usePendingChangesGuard\(\{[\s\S]*hasPendingChanges[\s\S]*isBlocked:\s*saving[\s\S]*message:\s*['"]分类内容有未保存更改，确定离开当前页面吗？['"]/
    )
    expect(account).toMatch(
      /usePendingChangesGuard\(\{[\s\S]*hasPendingChanges[\s\S]*isBlocked:\s*saving[\s\S]*message:\s*['"]账号信息有未保存更改，确定离开当前页面吗？['"]/
    )
    expect(library).toMatch(
      /usePendingChangesGuard\(\{[\s\S]*hasPendingChanges[\s\S]*message:\s*['"]资源库内容有未保存更改，确定离开当前页面吗？['"]/
    )
  })

  it('tracks taxonomy drafts across edit and create forms before leaving the page', () => {
    const source = read('src/features/admin/taxonomy/useTaxonomyAdmin.ts')

    expect(source).toMatch(/const\s+hasPendingChanges\s*=\s*computed\(/)
    expect(source).toMatch(/groupFormTitle\.value/)
    expect(source).toMatch(/groupFormOrder\.value/)
    expect(source).toMatch(/groupFormHidden\.value/)
    expect(source).toMatch(/createGroupId\.value/)
    expect(source).toMatch(/createGroupTitle\.value/)
    expect(source).toMatch(/createCategoryId\.value/)
    expect(source).toMatch(/createCategoryTitle\.value/)
    expect(source).toMatch(/categoryFormGroupId\.value/)
    expect(source).toMatch(/categoryFormTitle\.value/)
  })
})
