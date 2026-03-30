import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

function countSavingLocks(source: string): number {
  return [...source.matchAll(/:disabled="props\.saving"/g)].length
}

describe('admin save field locking', () => {
  it('locks all content edit controls while a save is in flight', () => {
    const source = read('src/views/admin/content/ContentEditPanel.vue')
    expect(countSavingLocks(source)).toBeGreaterThanOrEqual(8)
  })

  it('locks all uploads edit controls while a save is in flight', () => {
    const source = read('src/views/admin/uploads/UploadsEditPanel.vue')
    expect(countSavingLocks(source)).toBeGreaterThanOrEqual(8)
  })
})
