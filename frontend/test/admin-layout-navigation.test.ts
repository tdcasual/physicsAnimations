import { describe, expect, it } from 'vitest'
import { readExpandedSource } from './helpers/sourceReader'

function readFile(relPath: string): string {
  return readExpandedSource(relPath)
}

describe('admin layout navigation', () => {
  it('provides a direct link back to public catalog from the admin shell header', () => {
    const source = [
      readFile('src/views/admin/AdminLayoutView.vue'),
      readFile('src/components/admin/AdminShellHeader.vue'),
    ].join('\n')
    expect(source).toMatch(/to="\/"/)
    expect(source).toMatch(/主页面/)
  })
})
