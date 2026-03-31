import { describe, it, expect } from 'vitest'

describe('i18n', () => {
  it('should export i18n instance', async () => {
    const { i18n, setLocale } = await import('../index')

    expect(i18n).toBeDefined()
    expect(setLocale).toBeDefined()
    expect(typeof setLocale).toBe('function')
  })

  it('should have zh-CN locale loaded', async () => {
    const { i18n } = await import('../index')

    // 使用 getLocaleMessage 方法获取特定语言的消息
    const zhMessages = i18n.global.getLocaleMessage('zh-CN')
    expect(zhMessages).toBeDefined()
    expect(Object.keys(zhMessages).length).toBeGreaterThan(0)
  })

  it('should have en locale loaded', async () => {
    const { i18n } = await import('../index')

    // 使用 getLocaleMessage 方法获取特定语言的消息
    const enMessages = i18n.global.getLocaleMessage('en')
    expect(enMessages).toBeDefined()
    expect(Object.keys(enMessages).length).toBeGreaterThan(0)
  })

  it('should fallback to zh-CN for unknown locale', async () => {
    const { i18n } = await import('../index')

    // 测试回退机制 - fallbackLocale可能是字符串或数组
    const fallback = i18n.global.fallbackLocale
    expect(fallback).toBeDefined()
    // 确保fallbackLocale包含zh-CN
    if (typeof fallback === 'string') {
      expect(fallback).toBe('zh-CN')
    } else if (Array.isArray(fallback)) {
      expect(fallback).toContain('zh-CN')
    }
  })
})
