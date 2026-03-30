import { createMemoryHistory } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { createAppRouter } from '../src/router'

describe('router scroll behavior', () => {
  it('resets scroll to top-left for normal route navigation', async () => {
    const router = createAppRouter({ history: createMemoryHistory('/') })
    const scrollBehavior = router.options.scrollBehavior
    expect(scrollBehavior).toBeTypeOf('function')

    const position = await scrollBehavior!(
      { path: '/admin/content' } as never,
      { path: '/admin/library' } as never,
      null
    )

    expect(position).toEqual({ left: 0, top: 0 })
  })

  it('keeps saved scroll position for history navigation', async () => {
    const router = createAppRouter({ history: createMemoryHistory('/') })
    const scrollBehavior = router.options.scrollBehavior
    expect(scrollBehavior).toBeTypeOf('function')

    const saved = { left: 0, top: 420 }
    const position = await scrollBehavior!(
      { path: '/admin/content' } as never,
      { path: '/admin/library' } as never,
      saved
    )

    expect(position).toEqual(saved)
  })

  it('scrolls to hash anchors for public route navigation when no saved position exists', async () => {
    const router = createAppRouter({ history: createMemoryHistory('/') })
    const scrollBehavior = router.options.scrollBehavior
    expect(scrollBehavior).toBeTypeOf('function')

    const position = await scrollBehavior!(
      { path: '/', hash: '#catalog-library' } as never,
      { path: '/viewer/demo' } as never,
      null
    )

    expect(position).toEqual({ el: '#catalog-library' })
  })

  it('prefers hash anchors over empty top-left saved positions for hash history entries', async () => {
    const router = createAppRouter({ history: createMemoryHistory('/') })
    const scrollBehavior = router.options.scrollBehavior
    expect(scrollBehavior).toBeTypeOf('function')

    const position = await scrollBehavior!(
      { path: '/', hash: '#catalog-current' } as never,
      { path: '/viewer/demo' } as never,
      { left: 0, top: 0 }
    )

    expect(position).toEqual({ el: '#catalog-current' })
  })

  it('does not request missing admin hash anchors during redirect-style navigation', async () => {
    const router = createAppRouter({ history: createMemoryHistory('/') })
    const scrollBehavior = router.options.scrollBehavior
    expect(scrollBehavior).toBeTypeOf('function')

    const position = await scrollBehavior!(
      { path: '/admin/content', hash: '#batch' } as never,
      { path: '/login' } as never,
      null
    )

    expect(position).toEqual({ left: 0, top: 0 })
  })
})
