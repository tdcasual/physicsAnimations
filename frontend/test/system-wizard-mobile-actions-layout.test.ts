import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('system wizard mobile actions layout', () => {
  it('uses wider button targets and balanced spacing on small screens', () => {
    const source = read('src/views/admin/system/SystemWizardSteps.vue')
    expect(source).toMatch(/@media\s*\(max-width:\s*640px\)/)
    expect(source).toMatch(/\.wizard-panel\s*\{[\s\S]*padding:\s*12px/)
    expect(source).toMatch(/\.actions\s*\.btn\s*\{[\s\S]*flex:\s*1\s+1\s+calc\(50%\s*-\s*6px\)/)
  })
})
