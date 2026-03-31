import { describe, expect, it } from 'vitest'
import { readExpandedSource } from './helpers/sourceReader'

function read(relPath: string) {
  return readExpandedSource(relPath)
}

describe('library asset row layout', () => {
  it('keeps asset info visible by stacking actions under info in the middle column list', () => {
    const css = read('src/views/admin/library/AdminLibraryView.list.css')
    expect(css).toMatch(/\.asset-list\s*>\s*\.asset-item\s*\{[\s\S]*display:\s*grid/)
    // 支持单引号和双引号，以及跨行格式
    expect(css).toMatch(
      /\.asset-list\s*>\s*\.asset-item\s*\{[\s\S]*grid-template-areas:[\s\S]*['"]select main['"][\s\S]*['"]select actions['"]/
    )
    expect(css).toMatch(
      /\.asset-list\s*>\s*\.asset-item\s*\.asset-main\s*\{[\s\S]*grid-area:\s*main/
    )
    expect(css).toMatch(
      /\.asset-list\s*>\s*\.asset-item\s*\.asset-actions-inline\s*\{[\s\S]*grid-area:\s*actions/
    )
  })
})
