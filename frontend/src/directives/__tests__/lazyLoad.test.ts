import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { vLazy, lazyLoadStyles } from '../lazyLoad'

// Mock IntersectionObserver
class MockIntersectionObserver {
  callback: IntersectionObserverCallback
  elements: Element[] = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  observe(element: Element) {
    this.elements.push(element)
  }

  unobserve(element: Element) {
    this.elements = this.elements.filter(el => el !== element)
  }

  disconnect() {
    this.elements = []
  }

  trigger(entries: Partial<IntersectionObserverEntry>[]) {
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver)
  }
}

describe('vLazy directive', () => {
  let mockIO: typeof MockIntersectionObserver

  beforeEach(() => {
    mockIO = MockIntersectionObserver
    ;(global as any).IntersectionObserver = mockIO
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('styles', () => {
    it('should export lazy load styles', () => {
      expect(lazyLoadStyles).toContain('.lazy-image')
      expect(lazyLoadStyles).toContain('.lazy-loaded')
      expect(lazyLoadStyles).toContain('.lazy-loading')
      expect(lazyLoadStyles).toContain('.lazy-error')
    })
  })

  describe('mounted', () => {
    it('should add lazy-image class to element', () => {
      const el = document.createElement('img') as HTMLImageElement
      const binding = {
        value: 'test-image.jpg',
      } as any

      vLazy.mounted!(el, binding, null as any, null as any)

      expect(el.classList.contains('lazy-image')).toBe(true)
    })

    it('should set placeholder if provided', () => {
      const el = document.createElement('img') as HTMLImageElement
      const binding = {
        value: {
          src: 'test-image.jpg',
          placeholder: 'placeholder.jpg',
        },
      } as any

      vLazy.mounted!(el, binding, null as any, null as any)

      expect(el.src).toContain('placeholder.jpg')
    })

    it('should create IntersectionObserver when supported', () => {
      const el = document.createElement('img') as HTMLImageElement
      const binding = {
        value: 'test-image.jpg',
      } as any

      vLazy.mounted!(el, binding, null as any, null as any)

      expect((el as any)._lazyObserver).toBeDefined()
    })

    it('should handle string binding value', () => {
      const el = document.createElement('img') as HTMLImageElement
      const binding = {
        value: 'test-image.jpg',
      } as any

      vLazy.mounted!(el, binding, null as any, null as any)

      expect((el as any)._lazyOptions.src).toBe('test-image.jpg')
    })

    it('should handle object binding value', () => {
      const el = document.createElement('img') as HTMLImageElement
      const binding = {
        value: {
          src: 'test-image.jpg',
          placeholder: 'placeholder.jpg',
          error: 'error.jpg',
        },
      } as any

      vLazy.mounted!(el, binding, null as any, null as any)

      expect((el as any)._lazyOptions.src).toBe('test-image.jpg')
      expect((el as any)._lazyOptions.placeholder).toBe('placeholder.jpg')
      expect((el as any)._lazyOptions.error).toBe('error.jpg')
    })
  })

  describe('unmounted', () => {
    it('should disconnect observer on unmount', () => {
      const el = document.createElement('img') as HTMLImageElement
      const binding = {
        value: 'test-image.jpg',
      } as any

      vLazy.mounted!(el, binding, null as any, null as any)
      const observer = (el as any)._lazyObserver
      const disconnectSpy = vi.spyOn(observer, 'disconnect')

      vLazy.unmounted!(el, binding, null as any, null as any)

      expect(disconnectSpy).toHaveBeenCalled()
    })
  })
})
