import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('system wizard mobile actions layout', () => {
  it('uses wider button targets and balanced spacing on small screens', () => {
    const steps = read('src/views/admin/system/SystemWizardSteps.vue')
    const modeStep = read('src/views/admin/system/SystemWizardModeStep.vue')
    const validateStep = read('src/views/admin/system/SystemWizardValidateStep.vue')
    const syncStep = read('src/views/admin/system/SystemWizardSyncStep.vue')
    const allSources = [steps, modeStep, validateStep, syncStep].join('\n')
    
    expect(allSources).toMatch(/@media\s*\(max-width:\s*640px\)/)
    expect(allSources).toMatch(/\.wizard-panel\s*\{/)
    expect(allSources).toMatch(/padding:\s*12px/)
    expect(allSources).toMatch(/\.actions\s*\.btn\s*\{/)
    expect(allSources).toMatch(/flex:\s*1\s+1/)
  })
})
