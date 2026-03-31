import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('virtual list accessibility', () => {
  it('makes rendered items keyboard reachable and activatable', () => {
    const source = read('src/components/ui/VirtualList.vue')

    expect(source).toMatch(/role="listbox"/)
    expect(source).toMatch(/role="option"/)
    expect(source).toMatch(/tabindex="0"/)
    expect(source).toMatch(/aria-selected/)
    expect(source).toMatch(/function getOptionDomId/)
    expect(source).toMatch(/:id="getOptionDomId\(item\.id\)"/)
    expect(source).toMatch(/:aria-activedescendant="selectedOptionDomId"/)
    expect(source).toMatch(/@keydown="handleItemKeyDown\(\$event, item\)"/)
  })
})
