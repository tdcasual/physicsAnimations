import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('admin save/cancel locking', () => {
  it('locks content editor cancel while a save is in flight', () => {
    const source = read('src/views/admin/content/ContentEditPanel.vue')
    expect(source).toMatch(
      /<button type="button" class="btn btn-ghost" :disabled="props\.saving" @click="emit\('reset-edit'\)">取消<\/button>/
    )
    expect(source).toMatch(
      /<button type="button" class="btn btn-primary" :disabled="props\.saving" @click="emit\('save-edit', props\.selectedItem\.id\)">/
    )
  })

  it('locks uploads editor cancel while a save is in flight', () => {
    const source = read('src/views/admin/uploads/UploadsEditPanel.vue')
    expect(source).toMatch(
      /<button type="button" class="btn btn-ghost" :disabled="props\.saving" @click="emit\('reset-edit'\)">取消<\/button>/
    )
    expect(source).toMatch(
      /<button type="button" class="btn btn-primary" :disabled="props\.saving" @click="emit\('save-edit', props\.selectedItem\.id\)">/
    )
  })
})
