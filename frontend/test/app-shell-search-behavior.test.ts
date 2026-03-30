import { describe, expect, it } from 'vitest'
import { readExpandedSource } from './helpers/sourceReader'
import { resolveTopbarSearchState } from '../src/features/app/appShellTopbar'

function read(relPath: string): string {
  return readExpandedSource(relPath)
}

describe('app shell search behavior', () => {
  it('keeps live search only on the catalog route and switches other routes to an explicit return action', () => {
    expect(resolveTopbarSearchState('/')).toEqual({
      kind: 'input',
      target: null,
      placeholder: '搜索演示 / 分类',
    })
    expect(resolveTopbarSearchState('/viewer/demo')).toEqual({
      kind: 'return-link',
      target: '/',
      placeholder: '回目录搜索演示',
    })
    expect(resolveTopbarSearchState('/admin/dashboard')).toEqual({
      kind: 'return-link',
      target: '/',
      placeholder: '回目录搜索演示',
    })
  })

  it('renders a dedicated return-to-catalog affordance instead of routing away during typing', () => {
    const app = read('src/App.vue')

    expect(app).toMatch(/topbarSearchState/)
    expect(app).toMatch(/v-if="topbarSearchState\.kind === 'input'"/)
    expect(app).toMatch(/v-else[\s\S]*topbar-search-launch/)
    expect(app).not.toMatch(/router\.push\(nextPath\)/)
  })
})
