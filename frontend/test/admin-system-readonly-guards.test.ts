import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('admin system readOnly guards', () => {
  it('disables wizard form controls when backend reports readOnly mode', () => {
    const steps = read('src/views/admin/system/SystemWizardSteps.vue')
    const modeStep = read('src/views/admin/system/SystemWizardModeStep.vue')
    const connection = read('src/views/admin/system/SystemWizardConnectionStep.vue')

    expect(steps).toMatch(/:read-only-mode="readOnlyMode"/)
    // Radio inputs are in SystemWizardModeStep component
    expect(modeStep).toMatch(/type="radio"[\s\S]*?:disabled="[^"]*readOnlyMode/)

    expect(connection).toMatch(/readOnlyMode:\s*boolean/)
    expect(connection).toMatch(/class="field-input"[\s\S]*?:disabled="readOnlyMode"/)
    expect(connection).toMatch(/type="checkbox"[\s\S]*?:disabled="readOnlyMode"/)
  })
})
