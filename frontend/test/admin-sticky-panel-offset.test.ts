import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

function expectStickyPanelGuardrails(source: string) {
  expect(source).toMatch(/\.editor-panel\s*\{[\s\S]*position:\s*sticky/)
  expect(source).toMatch(/\.editor-panel\s*\{[\s\S]*align-self:\s*start/)
  expect(source).toMatch(
    /\.editor-panel\s*\{[\s\S]*top:\s*calc\(var\(--app-topbar-height,\s*0px\)\s*\+\s*12px\)/
  )
  expect(source).toMatch(
    /\.editor-panel\s*\{[\s\S]*max-height:\s*calc\(100dvh\s*-\s*var\(--app-topbar-height,\s*0px\)\s*-\s*32px\)/
  )
  expect(source).toMatch(/\.editor-panel\s*\{[\s\S]*overflow:\s*auto/)
  expect(source).toMatch(/\.editor-panel\s*\{[\s\S]*-webkit-overflow-scrolling:\s*touch/)
  expect(source).toMatch(
    /@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*\.editor-panel\s*\{[\s\S]*position:\s*static/
  )
  expect(source).toMatch(
    /@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*\.editor-panel\s*\{[\s\S]*max-height:\s*none/
  )
  expect(source).toMatch(
    /@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*\.editor-panel\s*\{[\s\S]*overflow:\s*visible/
  )
}

describe('admin sticky side panels', () => {
  it('keeps content editor panel below the shared topbar without grid stretch', () => {
    expectStickyPanelGuardrails(read('src/views/admin/AdminContentView.vue'))
  })

  it('keeps uploads editor panel below the shared topbar without grid stretch', () => {
    expectStickyPanelGuardrails(read('src/views/admin/AdminUploadsView.vue'))
  })
})
