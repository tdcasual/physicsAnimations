import { describe, expect, it } from 'vitest'

import {
  buildSystemUpdatePayload,
  canRunManualSync,
  isRemoteMode,
  normalizeUiMode,
  normalizeWebdavBasePath,
  parseTimeoutMs,
  shouldRequireWebdavUrl,
} from '../src/features/admin/systemFormState'

describe('systemFormState', () => {
  it('normalizes storage mode to local/webdav only', () => {
    expect(normalizeUiMode('webdav')).toBe('webdav')
    expect(normalizeUiMode('local')).toBe('local')
    expect(normalizeUiMode('hybrid')).toBe('')
    expect(normalizeUiMode('local+webdav')).toBe('')
    expect(normalizeUiMode('mirror')).toBe('')
    expect(normalizeUiMode('')).toBe('')
  })

  it('normalizes webdav base path with fallback', () => {
    expect(normalizeWebdavBasePath('  ')).toBe('physicsAnimations')
    expect(normalizeWebdavBasePath(' my/base ')).toBe('my/base')
  })

  it('parses timeout only when finite integer', () => {
    expect(parseTimeoutMs('15000')).toBe(15000)
    expect(parseTimeoutMs(' 2000 ')).toBe(2000)
    expect(parseTimeoutMs('15000ms')).toBeUndefined()
    expect(parseTimeoutMs('')).toBeUndefined()
    expect(parseTimeoutMs('abc')).toBeUndefined()
  })

  it('buildSystemUpdatePayload includes optional fields only when provided', () => {
    const payload = buildSystemUpdatePayload({
      mode: 'local',
      url: ' https://dav.example.com/root/ ',
      basePath: '  ',
      username: ' user1 ',
      password: '',
      timeoutRaw: '',
      scanRemote: true,
      sync: false,
    })

    expect(payload).toEqual({
      mode: 'local',
      sync: false,
      webdav: {
        url: 'https://dav.example.com/root/',
        basePath: 'physicsAnimations',
        username: 'user1',
        scanRemote: true,
      },
    })
  })

  it('buildSystemUpdatePayload keeps password and timeout when valid', () => {
    const payload = buildSystemUpdatePayload({
      mode: 'webdav',
      url: 'https://dav.example.com/root/',
      basePath: 'physicsAnimations',
      username: 'user1',
      password: 'secret',
      timeoutRaw: '30000',
      scanRemote: false,
      sync: true,
    })

    expect(payload.webdav.password).toBe('secret')
    expect(payload.webdav.timeoutMs).toBe(30000)
  })

  it('buildSystemUpdatePayload treats whitespace-only password as not provided', () => {
    const payload = buildSystemUpdatePayload({
      mode: 'webdav',
      url: 'https://dav.example.com/root/',
      basePath: 'physicsAnimations',
      username: 'user1',
      password: '   ',
      timeoutRaw: '15000',
      scanRemote: false,
      sync: false,
    })

    expect('password' in payload.webdav).toBe(false)
    expect(payload.webdav.timeoutMs).toBe(15000)
  })

  it('buildSystemUpdatePayload rejects invalid mode values', () => {
    expect(() =>
      buildSystemUpdatePayload({
        mode: 'hybrid',
        url: 'https://dav.example.com/root/',
        basePath: 'physicsAnimations',
        username: '',
        password: '',
        timeoutRaw: '',
        scanRemote: false,
        sync: false,
      })
    ).toThrow('invalid_storage_mode')
  })

  it('checks mode requirements and manual sync eligibility', () => {
    expect(isRemoteMode('hybrid')).toBe(false)
    expect(isRemoteMode('webdav')).toBe(true)
    expect(isRemoteMode('local')).toBe(false)

    expect(shouldRequireWebdavUrl('hybrid')).toBe(false)
    expect(shouldRequireWebdavUrl('webdav')).toBe(true)
    expect(shouldRequireWebdavUrl(' WebDAV ')).toBe(true)
    expect(shouldRequireWebdavUrl('local')).toBe(false)

    expect(canRunManualSync({ mode: 'hybrid', url: 'https://dav.example.com' })).toBe(false)
    expect(canRunManualSync({ mode: 'webdav', url: 'https://dav.example.com' })).toBe(true)
    expect(canRunManualSync({ mode: 'webdav', url: '   ' })).toBe(false)
    expect(canRunManualSync({ mode: 'local', url: 'https://dav.example.com' })).toBe(false)
  })
})
