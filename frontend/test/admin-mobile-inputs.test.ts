import { describe, expect, it } from 'vitest'
import { readExpandedSource } from './helpers/sourceReader'

function read(relPath: string): string {
  return readExpandedSource(relPath)
}

describe('admin mobile input safeguards', () => {
  it('disables auto-correct and auto-capitalization for link url input', () => {
    const source = read('src/views/admin/content/ContentCreateForm.vue')
    expect(source).toMatch(/type="url"/)
    expect(source).toMatch(/autocapitalize="none"/)
    expect(source).toMatch(/autocorrect="off"/)
    expect(source).toMatch(/spellcheck="false"/)
  })

  it('keeps shared field inputs constrained to container width on narrow screens', () => {
    const css = read('src/styles.css')
    expect(css).toMatch(/\.field-input\s*\{[^}]*width:\s*100%/)
    expect(css).toMatch(/\.field-input\s*\{[^}]*min-width:\s*0/)
  })

  it('keeps shared admin inputs tall enough for mobile touch interaction', () => {
    const css = read('src/styles.css')
    expect(css).toMatch(/\.admin-input\s*\{[^}]*width:\s*100%/)
    expect(css).toMatch(/\.admin-input\s*\{[^}]*min-width:\s*0/)
    expect(css).toMatch(/\.admin-input\s*\{[^}]*min-height:\s*42px/)
  })
})
