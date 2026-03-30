import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('admin account validation guards', () => {
  it('blocks whitespace-only username and password before submitting', () => {
    const source = read('src/views/admin/AdminAccountView.vue')
    expect(source).toMatch(/newUsername\.value && !newUsername\.value\.trim\(\)/)
    expect(source).toMatch(/newPassword\.value && !newPassword\.value\.trim\(\)/)
  })

  it('maps backend invalid field codes to field-level errors', () => {
    const source = read('src/views/admin/AdminAccountView.vue')
    expect(source).toMatch(/e\?\.data\?\.error === "invalid_username"/)
    expect(source).toMatch(/e\?\.data\?\.error === "invalid_password"/)
  })
})
