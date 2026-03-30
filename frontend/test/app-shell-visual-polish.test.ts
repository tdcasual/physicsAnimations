import { describe, expect, it } from 'vitest'
import { readExpandedSource } from './helpers/sourceReader'

function read(relPath: string): string {
  return readExpandedSource(relPath)
}

describe('app shell visual polish', () => {
  it('has route-tone and topbar interaction helpers', () => {
    const app = read('src/App.vue')

    expect(app).toMatch(/features\/app\/appShellTopbar/)
    expect(app).toMatch(/resolveTopbarModeClass/)
    expect(app).toMatch(/topbar--catalog|topbar--admin|topbar--viewer/)
  })

  it('has dedicated shell stylesheet', () => {
    const app = read('src/App.vue')

    expect(app).toMatch(/AppShell\.css/)
  })

  it('defines brand lockup with gradient mark', () => {
    const app = read('src/App.vue')
    const css = read('src/AppShell.css')

    expect(app).toMatch(/brand-lockup/)
    expect(app).toMatch(/brand-mark/)
    expect(css).toMatch(/brand-mark/)
    expect(css).toMatch(/linear-gradient/)
    expect(css).toMatch(/-webkit-background-clip:\s*text/)
  })

  it('has button hover feedback', () => {
    const css = read('src/AppShell.css')

    expect(css).toMatch(/\.btn\s*\{/)
    expect(css).toMatch(/\.btn:hover/)
    expect(css).toMatch(/transition:/)
  })

  it('has more-panel with group organization', () => {
    const app = read('src/App.vue')
    const css = read('src/AppShell.css')

    expect(app).toMatch(/topbar-more-panel/)
    expect(app).toMatch(/topbar-more-group/)
    expect(css).toMatch(/topbar-more-panel/)
    expect(css).toMatch(/topbar-more-group/)
  })

  it('has route-aware shell tone classes', () => {
    const app = read('src/App.vue')
    const css = read('src/AppShell.css')

    expect(css).toMatch(/topbar--viewer/)
    expect(css).toMatch(/topbar--admin/)
    expect(css).toMatch(/topbar--catalog/)
  })

  it('has navigation in topbar', () => {
    const app = read('src/App.vue')
    const css = read('src/AppShell.css')

    expect(app).toMatch(/RouterLink/)
    expect(app).toMatch(/to="\/"/)
  })

  it('has responsive design for mobile', () => {
    const css = read('src/AppShell.css')

    expect(css).toMatch(/@media\s*\(max-width:/)
    expect(css).toMatch(/topbar-more-trigger/)
    expect(css).toMatch(/topbar-inline-actions/)
  })
})
