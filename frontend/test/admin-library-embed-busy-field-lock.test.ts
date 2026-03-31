import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('admin library embed busy field locking', () => {
  it('locks embed create form fields while create/save is in flight', () => {
    const source = read('src/views/admin/library/panels/EmbedProfileCreatePanel.vue')
    expect(source).toMatch(
      /<input[\s\S]*?v-model=["']vm\.drafts\.embedProfileName["'][\s\S]*?:disabled=["']vm\.ui\.savingEmbed["']/s
    )
    expect(source).toMatch(
      /<input[\s\S]*?v-model=["']vm\.drafts\.embedScriptUrl["'][\s\S]*?:disabled=["']vm\.ui\.savingEmbed["']/s
    )
    expect(source).toMatch(
      /<textarea[\s\S]*?v-model=["']vm\.drafts\.embedDefaultOptionsJson["'][\s\S]*?:disabled=["']vm\.ui\.savingEmbed["']/s
    )
    expect(source).toMatch(
      /<input[\s\S]*?v-model=["']vm\.drafts\.embedEnabled["'][\s\S]*?:disabled=["']vm\.ui\.savingEmbed["']/s
    )
    // Check button exists with correct attributes and text content
    expect(source).toMatch(/btn btn-primary/s)
    expect(source).toMatch(/vm\.actions\.createEmbedProfileEntry/s)
    expect(source).toMatch(/新增 Embed 平台/s)
    expect(source).toMatch(/:disabled=["']vm\.ui\.savingEmbed["']/s)
  })

  it('locks embed edit form fields while save is in flight', () => {
    const source = read('src/views/admin/library/panels/EmbedProfileEditPanel.vue')
    expect(source).toMatch(
      /<input[\s\S]*?v-model=["']vm\.drafts\.embedEditName["'][\s\S]*?:disabled=["']vm\.ui\.savingEmbed["']/s
    )
    expect(source).toMatch(
      /<input[\s\S]*?v-model=["']vm\.drafts\.embedEditScriptUrl["'][\s\S]*?:disabled=["']vm\.ui\.savingEmbed["']/s
    )
    expect(source).toMatch(
      /<textarea[\s\S]*?v-model=["']vm\.drafts\.embedEditDefaultOptionsJson["'][\s\S]*?:disabled=["']vm\.ui\.savingEmbed["']/s
    )
    expect(source).toMatch(
      /<input[\s\S]*?v-model=["']vm\.drafts\.embedEditEnabled["'][\s\S]*?:disabled=["']vm\.ui\.savingEmbed["']/s
    )
    // Check buttons exist with correct attributes and text content
    expect(source).toMatch(/btn btn-primary/s)
    expect(source).toMatch(/vm\.actions\.saveEmbedProfileEdit/s)
    expect(source).toMatch(/保存平台/s)
    expect(source).toMatch(/btn btn-ghost/s)
    expect(source).toMatch(/vm\.actions\.cancelEmbedProfileEdit/s)
    expect(source).toMatch(/取消/s)
    expect(source).toMatch(/:disabled=["']vm\.ui\.savingEmbed["']/s)
  })
})
