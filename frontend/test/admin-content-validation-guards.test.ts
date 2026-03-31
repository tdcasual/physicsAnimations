import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('admin content validation guards', () => {
  it('prevents submitting whitespace-only edit title before request is sent', () => {
    const source = read('src/features/admin/content/useContentAdminActions.ts')
    expect(source).toMatch(/const\s+title\s*=\s*ctx\.editTitle\.value\.trim\(\)/)
    expect(source).toMatch(/if\s*\(!title\)/)
    expect(source).toMatch(/setFieldError\(['"]editTitle['"],\s*['"]标题不能为空。['"]\)/)
    expect(source).toMatch(/setActionFeedback\(['"]标题不能为空。['"],\s*true\)/)
  })

  it('maps backend invalid_title to field-level editTitle feedback', () => {
    const source = read('src/features/admin/content/useContentAdminActions.ts')
    expect(source).toMatch(/e\?\.data\?\.error\s*===\s*['"]invalid_title['"]/)
    expect(source).toMatch(/setFieldError\(['"]editTitle['"],\s*['"]标题不能为空。['"]\)/)
  })

  it('renders edit title error inline in content edit panel', () => {
    const source = read('src/views/admin/content/ContentEditPanel.vue')
    expect(source).toMatch(/editTitleError:\s*string/)
    expect(source).toMatch(/:class="\{\s*'has-error':\s*props\.editTitleError\s*\}"/)
    expect(source).toMatch(/v-if="props\.editTitleError"/)
    expect(source).toMatch(/class="field-error-text"/)
  })

  it('passes edit title field error from view-model to edit panel', () => {
    const source = read('src/views/admin/AdminContentView.vue')
    expect(source).toMatch(/:edit-title-error="vm\.getFieldError\('editTitle'\)"/)
    expect(source).toMatch(
      /@update:edit-title="[\s\S]*vm\.editTitle = \$event;[\s\S]*vm\.clearFieldErrors\('editTitle'\)/
    )
  })
})
