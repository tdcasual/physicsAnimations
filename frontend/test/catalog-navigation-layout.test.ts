import { describe, expect, it } from 'vitest'
import { readExpandedSource } from './helpers/sourceReader'

function readFile(relPath: string): string {
  return readExpandedSource(relPath)
}

describe('catalog navigation homepage layout', () => {
  it('has a hero section with title and stats', () => {
    const source = readFile('src/views/CatalogView.vue')

    expect(source).toMatch(/class="catalog-hero"/)
    expect(source).toMatch(/class="hero-title"/)
    expect(source).toMatch(/class="hero-subtitle"/)
    expect(source).toMatch(/高中物理动画演示/)
  })

  it('moves the search box into the global topbar for cross-route access', () => {
    const appSource = readFile('src/App.vue')

    expect(appSource).toMatch(/class="topbar-search"/)
    expect(appSource).toMatch(/topbar-search-field|onTopbarSearch/)
  })

  it('has navigation tabs for groups and categories', () => {
    const source = readFile('src/views/CatalogView.vue')

    expect(source).toMatch(/class="nav-groups/)
    expect(source).toMatch(/class="nav-categories/)
    expect(source).toMatch(/class="nav-tab/)
  })

  it('displays content in a responsive grid', () => {
    const source = readFile('src/views/CatalogView.vue')

    expect(source).toMatch(/class="items-grid"/)
    expect(source).toMatch(/class="item-card"/)
    expect(source).toMatch(/grid-template-columns/)
  })

  it('shows library highlights when available', () => {
    const source = readFile('src/views/CatalogView.vue')

    expect(source).toMatch(/class="catalog-library"/)
    expect(source).toMatch(/资源库精选/)
  })
})
