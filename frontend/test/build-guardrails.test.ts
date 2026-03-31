import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('build guardrails', () => {
  it('keeps the manifest link well-formed in index.html', () => {
    const source = read('index.html')
    expect(source).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"\s*\/>/)
  })

  it('keeps stylesheet imports before any other rules in styles.css', () => {
    const source = read('src/styles.css').trimStart()
    const withoutLeadingComment = source.replace(/^\/\*[\s\S]*?\*\/\s*/, '')
    expect(withoutLeadingComment.startsWith("@import './styles/foundation.css';")).toBe(true)
  })

  it('inlines the Workbox runtime to avoid rollup manualChunks warnings', () => {
    const source = read('vite.config.ts')
    expect(source).toMatch(/inlineWorkboxRuntime:\s*true/)
  })
})
