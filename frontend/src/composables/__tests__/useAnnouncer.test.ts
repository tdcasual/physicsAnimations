import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAnnouncer } from '../useAnnouncer'

describe('useAnnouncer', () => {
  beforeEach(() => {
    // Clean up any existing announcer elements
    document.getElementById('aria-announcer-polite')?.remove()
    document.getElementById('aria-announcer-assertive')?.remove()
  })

  afterEach(() => {
    document.getElementById('aria-announcer-polite')?.remove()
    document.getElementById('aria-announcer-assertive')?.remove()
  })

  it('should return announce and clear functions', () => {
    const { announce, clear } = useAnnouncer()

    expect(typeof announce).toBe('function')
    expect(typeof clear).toBe('function')
  })

  it('should create polite announcer element', async () => {
    const { announce } = useAnnouncer()

    await announce('Test message', 'polite')

    const announcer = document.getElementById('aria-announcer-polite')
    expect(announcer).toBeTruthy()
    expect(announcer?.getAttribute('aria-live')).toBe('polite')
    expect(announcer?.getAttribute('aria-atomic')).toBe('true')
  })

  it('should create assertive announcer element', async () => {
    const { announce } = useAnnouncer()

    await announce('Test message', 'assertive')

    const announcer = document.getElementById('aria-announcer-assertive')
    expect(announcer).toBeTruthy()
    expect(announcer?.getAttribute('aria-live')).toBe('assertive')
  })

  it('should announce message with polite priority by default', async () => {
    const { announce } = useAnnouncer()

    await announce('Test message')

    const announcer = document.getElementById('aria-announcer-polite')
    expect(announcer?.textContent).toBe('Test message')
  })

  it('should announce message with assertive priority', async () => {
    const { announce } = useAnnouncer()

    await announce('Error message', 'assertive')

    const announcer = document.getElementById('aria-announcer-assertive')
    expect(announcer?.textContent).toBe('Error message')
  })

  it('should clear specific priority announcer', async () => {
    const { announce, clear } = useAnnouncer()

    await announce('Test message', 'polite')
    clear('polite')

    const announcer = document.getElementById('aria-announcer-polite')
    expect(announcer?.textContent).toBe('')
  })

  it('should clear all announcers when no priority specified', async () => {
    const { announce, clear } = useAnnouncer()

    await announce('Polite message', 'polite')
    await announce('Assertive message', 'assertive')
    clear()

    expect(document.getElementById('aria-announcer-polite')?.textContent).toBe('')
    expect(document.getElementById('aria-announcer-assertive')?.textContent).toBe('')
  })
})
