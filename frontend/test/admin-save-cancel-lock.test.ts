import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('admin save/cancel locking', () => {
  it('locks content editor cancel while a save is in flight', () => {
    const source = read('src/views/admin/content/ContentEditPanel.vue')
    expect(source).toMatch(/btn-ghost/)
    expect(source).toMatch(/:disabled="props\.saving"/)
    expect(source).toMatch(/reset-edit/)
    expect(source).toMatch(/btn-primary/)
    expect(source).toMatch(/save-edit/)
  })

  it('locks uploads editor cancel while a save is in flight', () => {
    const source = read('src/views/admin/uploads/UploadsEditPanel.vue')
    expect(source).toMatch(/btn-ghost/)
    expect(source).toMatch(/:disabled="props\.saving"/)
    expect(source).toMatch(/reset-edit/)
    expect(source).toMatch(/btn-primary/)
    expect(source).toMatch(/save-edit/)
  })
})
