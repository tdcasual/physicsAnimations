import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('login visual polish', () => {
  it('has a centered login card with branding', () => {
    const source = read('src/views/LoginView.vue')

    expect(source).toMatch(/class="login-page"/)
    expect(source).toMatch(/class="login-card"/)
    expect(source).toMatch(/PCard/)
    expect(source).toMatch(/科学演示集/)
  })

  it('has form inputs with icons and labels', () => {
    const source = read('src/views/LoginView.vue')

    expect(source).toMatch(/PInput/)
    expect(source).toMatch(/form-label/)
    expect(source).toMatch(/username/)
    expect(source).toMatch(/password/)
  })

  it('has error display with icon', () => {
    const source = read('src/views/LoginView.vue')

    expect(source).toMatch(/form-error/)
    expect(source).toMatch(/error-icon/)
    expect(source).toMatch(/v-if="errorText"/)
  })

  it('has primary action button', () => {
    const source = read('src/views/LoginView.vue')

    expect(source).toMatch(/PButton/)
    expect(source).toMatch(/variant="primary"/)
    expect(source).toMatch(/登录/)
  })

  it('has back link to home', () => {
    const source = read('src/views/LoginView.vue')

    expect(source).toMatch(/back-link/)
    expect(source).toMatch(/to="\/"/)
    expect(source).toMatch(/返回首页/)
  })

  it('has responsive layout', () => {
    const css = read('src/views/LoginView.vue')

    expect(css).toMatch(/@media\s*\(max-width:/)
    expect(css).toMatch(/max-width:/)
  })
})
