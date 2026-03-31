import { describe, expect, it } from 'vitest'
import { readExpandedSource } from './helpers/sourceReader'

function read(relPath: string): string {
  return readExpandedSource(relPath)
}

describe('catalog library cards', () => {
  it('renders folder cards in catalog view', () => {
    const source = read('src/views/CatalogView.vue')

    expect(source).toMatch(/libraryHighlights/)
    expect(source).toMatch(/folder-card/)
    expect(source).toMatch(/\/library\/folder\//)
  })

  it('has folder icon placeholder', () => {
    const css = read('src/views/CatalogView.css')

    expect(css).toMatch(/folder-icon/)
    expect(css).toMatch(/folder-card/)
  })
})
