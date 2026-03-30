import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('admin search empty state copy', () => {
  it('distinguishes content search misses from a truly empty content list', () => {
    const source = read('src/views/admin/content/ContentListPanel.vue')
    expect(source).toMatch(/props\.query\.trim\(\)\s*\?\s*"未找到匹配内容。"\s*:\s*"暂无内容。"/)
  })

  it('distinguishes upload search misses from a truly empty upload list', () => {
    const source = read('src/views/admin/uploads/UploadsListPanel.vue')
    expect(source).toMatch(
      /props\.query\.trim\(\)\s*\?\s*"未找到匹配的上传内容。"\s*:\s*"暂无上传内容。"/
    )
  })
})
