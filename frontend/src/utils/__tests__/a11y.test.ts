import { describe, it, expect } from 'vitest'
import {
  generateId,
  getContrastRatio,
  meetsContrastStandard,
  handleKeyboardShortcut,
  commonShortcuts,
  ariaRoles,
  setupFocusVisible,
} from '../a11y'

describe('a11y utils', () => {
  describe('generateId', () => {
    it('should generate unique IDs with default prefix', () => {
      const id1 = generateId()
      const id2 = generateId()

      expect(id1).toMatch(/^a11y-/)
      expect(id2).toMatch(/^a11y-/)
      expect(id1).not.toBe(id2)
    })

    it('should generate IDs with custom prefix', () => {
      const id = generateId('custom')

      expect(id).toMatch(/^custom-/)
    })
  })

  describe('getContrastRatio', () => {
    it('should return high ratio for black on white', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF')

      expect(ratio).toBeCloseTo(21, 0)
    })

    it('should return low ratio for similar colors', () => {
      const ratio = getContrastRatio('#777777', '#888888')

      expect(ratio).toBeLessThan(2)
    })

    it('should handle RGB format', () => {
      const ratio = getContrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)')

      expect(ratio).toBeCloseTo(21, 0)
    })

    it('should handle 3-digit hex', () => {
      const ratio = getContrastRatio('#000', '#FFF')

      expect(ratio).toBeCloseTo(21, 0)
    })
  })

  describe('meetsContrastStandard', () => {
    it('should pass for black on white (normal text)', () => {
      expect(meetsContrastStandard('#000000', '#FFFFFF')).toBe(true)
    })

    it('should fail for light gray on white', () => {
      expect(meetsContrastStandard('#CCCCCC', '#FFFFFF')).toBe(false)
    })

    it('should pass with lower standard for large text', () => {
      // Dark gray on white should pass for large text (3:1 standard)
      expect(meetsContrastStandard('#666666', '#FFFFFF', true)).toBe(true)
    })
  })

  describe('handleKeyboardShortcut', () => {
    it('should call handler for matching shortcut', () => {
      const handler = vi.fn()
      const shortcuts = { 'ctrl+s': handler }

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
      })

      handleKeyboardShortcut(event, shortcuts)

      expect(handler).toHaveBeenCalled()
    })

    it('should not call handler for non-matching shortcut', () => {
      const handler = vi.fn()
      const shortcuts = { 'ctrl+s': handler }

      const event = new KeyboardEvent('keydown', {
        key: 's',
      })

      handleKeyboardShortcut(event, shortcuts)

      expect(handler).not.toHaveBeenCalled()
    })

    it('should prevent default when shortcut matched', () => {
      const handler = vi.fn()
      const shortcuts = { 'ctrl+s': handler }

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
      })

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      handleKeyboardShortcut(event, shortcuts)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('commonShortcuts', () => {
    it('should contain common keyboard shortcuts', () => {
      expect(commonShortcuts.escape).toBe('escape')
      expect(commonShortcuts.enter).toBe('enter')
      expect(commonShortcuts.ctrlS).toBe('ctrl+s')
      expect(commonShortcuts.arrowUp).toBe('arrowup')
    })
  })

  describe('ariaRoles', () => {
    it('should contain landmark roles', () => {
      expect(ariaRoles.banner).toBeDefined()
      expect(ariaRoles.navigation).toBeDefined()
      expect(ariaRoles.main).toBeDefined()
    })

    it('should contain widget roles', () => {
      expect(ariaRoles.button).toBeDefined()
      expect(ariaRoles.dialog).toBeDefined()
    })
  })

  describe('setupFocusVisible', () => {
    it('should add event listeners to document body', () => {
      const addEventListenerSpy = vi.spyOn(document.body, 'addEventListener')

      setupFocusVisible()

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      addEventListenerSpy.mockRestore()
    })
  })
})

import { vi } from 'vitest'
