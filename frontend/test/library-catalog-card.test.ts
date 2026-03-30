import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('catalog library cards', () => {
  it('renders folder cards in catalog view', () => {
    const source = read('src/views/CatalogView.vue')

    expect(source).toMatch(/libraryHighlights/)
    expect(source).toMatch(/folder-card/)
    expect(source).toMatch(/\/library\/folder\//)
  })

  it('has folder icon placeholder', () => {
    const css = read('src/views/CatalogView.vue')

    expect(css).toMatch(/folder-icon/)
    expect(css).toMatch(/folder-card/)
  })
})
