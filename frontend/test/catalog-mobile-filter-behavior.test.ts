import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('catalog mobile filter behavior', () => {
  it('has responsive navigation tabs', () => {
    const source = read('src/views/CatalogView.vue')
    const css = read('src/views/CatalogView.css')

    expect(source).toMatch(/nav-groups/)
    expect(source).toMatch(/nav-categories/)
    expect(css).toMatch(/overflow-x:\s*auto/)
    expect(css).toMatch(/@media\s*\(max-width:/)
  })

  it('has scrollable tabs on mobile', () => {
    const css = read('src/views/CatalogView.css')

    expect(css).toMatch(/scrollbar-width:\s*none/)
    expect(css).toMatch(/::-webkit-scrollbar/)
  })
})
