import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('catalog internal routing', () => {
  it('uses router-aware navigation for internal links', () => {
    const source = read('src/views/CatalogView.vue')

    expect(source).toMatch(/RouterLink/)
    expect(source).toMatch(/:to="getItemHref/)
  })

  it('handles external links with anchor tags', () => {
    const source = read('src/views/CatalogView.vue')

    expect(source).toMatch(/target="_blank"/)
    expect(source).toMatch(/rel="noopener"/)
    expect(source).toMatch(/isExternalLink/)
  })

  it('has proper href generation for items', () => {
    const source = read('src/views/CatalogView.vue')

    expect(source).toMatch(/getItemHref/)
    expect(source).toMatch(/item\.href/)
    expect(source).toMatch(/\/viewer\//)
  })
})
