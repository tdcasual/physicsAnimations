import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

describe('useOnline', () => {
  // Since useOnline uses lifecycle hooks, we'll test the logic directly
  it('should be defined', async () => {
    const { useOnline } = await import('../useOnline')
    expect(useOnline).toBeDefined()
    expect(typeof useOnline).toBe('function')
  })

  it('should return a ref', async () => {
    const { useOnline } = await import('../useOnline')
    const result = useOnline()
    expect(result).toBeDefined()
    expect(result.value).toBeDefined()
  })
})
