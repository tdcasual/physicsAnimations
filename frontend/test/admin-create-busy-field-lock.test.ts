import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('admin create form busy field locking', () => {
  it('locks content link create fields while save is in flight', () => {
    const source = read('src/views/admin/content/ContentCreateForm.vue')
    expect(source).toMatch(
      /<select[\s\S]*:disabled="props\.saving"[\s\S]*@change="emit\('update:linkCategoryId'/
    )
    expect(source).toMatch(/<input[\s\S]*type="url"[\s\S]*:disabled="props\.saving"[\s\S]*@input=/)
    expect(source).toMatch(
      /<input[\s\S]*:value="props\.linkTitle"[\s\S]*:disabled="props\.saving"[\s\S]*@input=/
    )
    expect(source).toMatch(
      /<textarea[\s\S]*:value="props\.linkDescription"[\s\S]*:disabled="props\.saving"[\s\S]*@input=/
    )
    expect(source).toMatch(
      /<button type="button" class="btn btn-primary" :disabled="props\.saving" @click="emit\('submit'\)">添加<\/button>/
    )
  })

  it('locks upload create fields while save is in flight', () => {
    const source = read('src/views/admin/uploads/UploadsCreateForm.vue')
    expect(source).toMatch(
      /<select[\s\S]*:disabled="props\.saving"[\s\S]*@change="emit\('update:categoryId'/
    )
    expect(source).toMatch(
      /<input[\s\S]*id="upload-file-input"[\s\S]*:disabled="props\.saving"[\s\S]*@change="onInputFile"/
    )
    expect(source).toMatch(
      /<input[\s\S]*:value="props\.title"[\s\S]*:disabled="props\.saving"[\s\S]*@input=/
    )
    expect(source).toMatch(
      /<textarea[\s\S]*:value="props\.description"[\s\S]*:disabled="props\.saving"[\s\S]*@input=/
    )
    expect(source).toMatch(
      /<button type="button" class="btn btn-primary" :disabled="props\.saving" @click="emit\('submit'\)">上传<\/button>/
    )
  })
})
