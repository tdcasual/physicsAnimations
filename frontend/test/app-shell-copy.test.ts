import { describe, expect, it } from 'vitest'
import { readExpandedSource } from './helpers/sourceReader'

function readFile(relPath: string): string {
  return readExpandedSource(relPath)
}

describe('app shell copy', () => {
  it('uses a compact shared brand mark without the old teaching-atlas framing', () => {
    const source = readFile('src/App.vue')

    expect(source).toMatch(/class="brand-lockup"/)
    expect(source).toMatch(/class="brand-mark"/)
    expect(source).toMatch(/科学演示集/)
    expect(source).not.toMatch(/我的科学演示集/)
    expect(source).not.toMatch(/我的学科演示集/)
    expect(source).not.toMatch(/教学实验图谱/)
    expect(source).not.toMatch(/brand-meta/)
  })

  it('does not display migration-in-progress wording in brand subtitle', () => {
    const source = readFile('src/App.vue')

    expect(source.includes('迁移中')).toBe(false)
  })

  it('drops the old navigation-oriented brand subtitle from the shared shell', () => {
    const source = readFile('src/App.vue')

    expect(source).not.toMatch(/更快找到课堂演示与资源/)
  })

  it('provides a direct catalog entry in the public shell', () => {
    const source = readFile('src/App.vue')

    expect(source).toMatch(/to="\/"/)
    expect(source).toMatch(/topbar-home-link/)
    expect(source).toMatch(/aria-label="浏览首页"/)
    expect(source).toMatch(/class="topbar-home-label"/)
    expect(source).toMatch(/>\s*首页\s*</)
  })

  it('uses a mobile more-panel and desktop inline-actions for compact brand and action hierarchy', () => {
    const source = readFile('src/App.vue')

    expect(source).toMatch(/class="brand-lockup"/)
    expect(source).toMatch(/class="brand-mark"/)
    expect(source).toMatch(/topbar-more-trigger/)
    expect(source).toMatch(/topbar-more-panel/)
    expect(source).toMatch(/topbar-inline-actions/)
  })

  it('frames utility controls as preference settings inside the more panel', () => {
    const source = readFile('src/App.vue')

    expect(source).toMatch(/昼夜主题/)
    expect(source).toMatch(/topbar-more-group/)
    expect(source).not.toMatch(/>\s*界面\s*</)
  })

  it('uses grouped actions inside the more panel and inline actions on desktop', () => {
    const source = readFile('src/App.vue')

    expect(source).toMatch(/topbar-more-group/)
    expect(source).toMatch(/topbar-inline-actions/)
    expect(source).not.toMatch(/topbar-utility-note/)
  })

  it('hides the redundant admin shortcut once the user is already inside admin routes', () => {
    const source = readFile('src/App.vue')

    expect(source).toMatch(/const showAdminShortcut = computed/)
    expect(source).toMatch(/v-if="showAdminShortcut"/)
    expect(source).toMatch(/topbar-admin-link/)
  })

  it('binds route-aware topbar tone classes so browsing and work modes read faster', () => {
    const source = [readFile('src/App.vue'), readFile('src/features/app/appShellTopbar.ts')].join(
      '\n'
    )

    expect(source).toMatch(/topbar--catalog/)
    expect(source).toMatch(/topbar--viewer/)
    expect(source).toMatch(/topbar--admin/)
    expect(source).toMatch(/topbar--library/)
  })

  it('places a global search box in the topbar next to the brand', () => {
    const source = readFile('src/App.vue')

    expect(source).toMatch(/class="topbar-search"/)
    expect(source).toMatch(/topbar-search-field/)
    expect(source).toMatch(/onTopbarSearch/)
    expect(source).toMatch(/useCatalogSearch/)
  })
})
