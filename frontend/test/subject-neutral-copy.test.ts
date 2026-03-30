import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('subject-neutral visible copy', () => {
  it('uses a compact topbar brand while keeping document and catalog wording subject-neutral', () => {
    const app = read('src/App.vue')
    const chrome = read('src/views/useCatalogViewChrome.ts')
    const state = read('src/features/catalog/useCatalogViewState.ts')
    const service = read('src/features/catalog/catalogService.ts')

    expect(app).toMatch(/科学演示集/)
    expect(app).not.toMatch(/我的科学演示集/)
    expect(app).not.toMatch(/我的物理动画集/)
    expect(app).not.toMatch(/我的学科演示集/)
    expect(chrome).toMatch(/我的科学演示集/)
    expect(state).toMatch(/"学科"/)
    expect(service).toMatch(/title:\s*"学科"/)
  })

  it('keeps admin and library fallback labels subject-neutral', () => {
    const taxonomyActions = read('src/features/admin/taxonomy/useTaxonomyAdminActions.ts')
    const libraryActions = read('src/features/library/useLibraryFolderActions.ts')

    expect(taxonomyActions).toMatch(/默认（学科）/)
    expect(taxonomyActions).not.toMatch(/默认（物理）/)
    expect(libraryActions).toMatch(/学科 \/ 其他/)
    expect(libraryActions).not.toMatch(/物理 \/ 其他/)
  })
})
