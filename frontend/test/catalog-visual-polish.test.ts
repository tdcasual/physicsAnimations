import { describe, expect, it } from 'vitest'
import { readExpandedSource } from './helpers/sourceReader'

function read(relPath: string): string {
  return readExpandedSource(relPath)
}

describe('catalog visual polish', () => {
  it('has a hero section with gradient title', () => {
    const vue = read('src/views/CatalogView.vue')
    const css = read('src/views/CatalogView.css')

    expect(vue).toMatch(/class="catalog-hero"/)
    expect(vue).toMatch(/class="hero-title"/)
    expect(css).toMatch(/background:\s*linear-gradient/)
    expect(css).toMatch(/-webkit-background-clip:\s*text/)
  })

  it('has interactive cards', () => {
    const css = read('src/views/CatalogView.css')

    expect(css).toMatch(/\.item-card/)
    expect(css).toMatch(/transform:\s*scale/)
    expect(css).toMatch(/transition:/)
  })

  it('has responsive grid layout', () => {
    const css = read('src/views/CatalogView.css')

    expect(css).toMatch(/grid-template-columns/)
    expect(css).toMatch(/@media\s*\(max-width:/)
  })

  it('has sticky navigation', () => {
    const css = read('src/views/CatalogView.css')

    expect(css).toMatch(/position:\s*sticky/)
    expect(css).toMatch(/top:\s*64px/)
  })

  it('displays empty state when no items', () => {
    const vue = read('src/views/CatalogView.vue')

    expect(vue).toMatch(/PEmpty/)
    expect(vue).toMatch(/暂无符合条件的演示/)
  })

  it('has favorite button with effect', () => {
    const vue = read('src/views/CatalogView.vue')
    const css = read('src/views/CatalogView.css')

    expect(vue).toMatch(/class="favorite-btn"/)
    expect(css).toMatch(/\.favorite-btn/)
    expect(css).toMatch(/\.item-card:hover/)
  })
})
