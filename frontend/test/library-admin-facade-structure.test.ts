import { describe, expect, it } from 'vitest'
import { readStateFacade } from './library-admin-facade-test-utils'

describe('library admin facade structure', () => {
  it('builds grouped facade buckets for ui and action domains', () => {
    const stateFacade = readStateFacade()
    expect(stateFacade).toMatch(/\bui:\s*T\["ui"\]/)
    expect(stateFacade).toMatch(/\bactions:\s*T\["actions"\]/)
    expect(stateFacade).toMatch(/\bfilters:\s*T\["filters"\]/)
  })

  it('exposes grouped-only facade surface without flat passthrough', () => {
    const stateFacade = readStateFacade()
    expect(stateFacade).not.toMatch(/\.\.\.state,/)
  })

  it('defines explicit facade input keys instead of Record index signatures', () => {
    const stateFacade = readStateFacade()
    expect(stateFacade).toMatch(/\btype LibraryAdminStateInput = \{/)
    expect(stateFacade).toMatch(/\btype FacadeBuckets<T extends LibraryAdminStateInput> = \{/)
    expect(stateFacade).not.toMatch(/Record<string,\s*unknown>/)
    expect(stateFacade).not.toMatch(/state:\s*Record<string,\s*unknown>/)
  })

  it('uses generic facade buckets to preserve concrete input property types', () => {
    const stateFacade = readStateFacade()
    expect(stateFacade).toMatch(/\btype FacadeBuckets<T extends LibraryAdminStateInput> = \{/)
    expect(stateFacade).toMatch(
      /createLibraryAdminStateFacade<T extends LibraryAdminStateInput>\(state: T\): FacadeBuckets<T>/
    )
    expect(stateFacade).not.toMatch(
      /createLibraryAdminStateFacade\(state: LibraryAdminStateInput\): FacadeBuckets/
    )
  })
})
