import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('mobile touch targets', () => {
  it('has minimum touch heights for buttons', () => {
    const css = read('src/AppShell.css')

    expect(css).toMatch(/height:\s*40px/)
    expect(css).toMatch(/height:\s*44px/)
  })

  it('has proper padding for touch targets', () => {
    const css = read('src/AppShell.css')

    expect(css).toMatch(/padding:/)
  })
})
