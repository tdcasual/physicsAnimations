import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8')
}

describe('library embed profile action composable split', () => {
  it('routes create/edit/sync actions through dedicated embedProfile submodules', () => {
    const state = read('src/features/library/useLibraryAdminState.ts')
    const wiring = read('src/features/library/useLibraryAdminActionWiring.ts')
    const actions = read('src/features/library/useLibraryEmbedProfileActions.ts')
    const deps = read('src/features/library/embedProfile/embedProfileActionDeps.ts')
    const create = read('src/features/library/embedProfile/useEmbedProfileCreateActions.ts')
    const edit = read('src/features/library/embedProfile/useEmbedProfileEditActions.ts')
    const sync = read('src/features/library/embedProfile/useEmbedProfileSyncActions.ts')

    expect(state).not.toMatch(/async function createEmbedProfileEntry/)
    expect(state).not.toMatch(/async function saveEmbedProfileEdit/)
    expect([state, wiring].join('\n')).toMatch(/useLibraryEmbedProfileActions/)

    expect(actions).toMatch(/useEmbedProfileCreateActions/)
    expect(actions).toMatch(/useEmbedProfileEditActions/)
    expect(actions).toMatch(/useEmbedProfileSyncActions/)
    expect(actions).not.toMatch(/await createLibraryEmbedProfile/)
    expect(actions).not.toMatch(/await updateLibraryEmbedProfile/)
    expect(actions).not.toMatch(/await deleteLibraryEmbedProfile/)
    expect(actions).not.toMatch(/await syncLibraryEmbedProfile/)

    expect(deps).toMatch(/export interface UseLibraryEmbedProfileActionsDeps/)
    expect(create).toMatch(/export function useEmbedProfileCreateActions/)
    expect(edit).toMatch(/export function useEmbedProfileEditActions/)
    expect(sync).toMatch(/export function useEmbedProfileSyncActions/)
    expect(create).toMatch(/async function createEmbedProfileEntry/)
    expect(edit).toMatch(/async function saveEmbedProfileEdit/)
    expect(sync).toMatch(/async function removeEmbedProfile/)
    expect(sync).toMatch(/async function syncEmbedProfileEntry/)
  })
})
