import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('login inline error reset', () => {
  it('clears stale login errors while typing', () => {
    const source = read('src/views/LoginView.vue')

    expect(source).toMatch(/clearError/)
    expect(source).toMatch(/@input="clearError"/)
    expect(source).toMatch(/errorText\.value\s*=\s*['"]['"]/)
  })

  it('has error display that shows only when error exists', () => {
    const source = read('src/views/LoginView.vue')

    expect(source).toMatch(/v-if="errorText"/)
    expect(source).toMatch(/form-error/)
  })
})
