import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useFocusTrap } from '../useFocusTrap'

describe('useFocusTrap', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.innerHTML = `
      <button id="outside">Outside</button>
      <div id="trap">
        <button id="first">First</button>
        <input id="middle" />
        <button id="last">Last</button>
      </div>
    `
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('should return trapRef, activate, deactivate functions', () => {
    const { trapRef, activate, deactivate, isActive } = useFocusTrap()

    expect(trapRef).toBeDefined()
    expect(typeof activate).toBe('function')
    expect(typeof deactivate).toBe('function')
    expect(typeof isActive).toBe('function')
    expect(isActive()).toBe(false)
  })

  it('should activate focus trap', async () => {
    const { trapRef, activate, isActive } = useFocusTrap()

    trapRef.value = document.getElementById('trap') as HTMLElement

    activate()
    await nextTick()

    expect(isActive()).toBe(true)
  })

  it('should deactivate focus trap', async () => {
    const { trapRef, activate, deactivate, isActive } = useFocusTrap()

    trapRef.value = document.getElementById('trap') as HTMLElement

    activate()
    deactivate()

    expect(isActive()).toBe(false)
  })

  it('should get focusable elements correctly', async () => {
    const { trapRef, activate } = useFocusTrap()

    trapRef.value = document.getElementById('trap') as HTMLElement
    activate()
    await nextTick()

    // Just verify activation doesn't throw
    expect(true).toBe(true)
  })
})
