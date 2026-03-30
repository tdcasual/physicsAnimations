import { createApp, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { vi } from 'vitest'

export const mockGetSystemInfo = vi.fn()
export const mockUpdateSystemStorage = vi.fn()
export const mockValidateSystemStorage = vi.fn()
export const mockUpdateSystemEmbedUpdater = vi.fn()

vi.mock('../../src/features/admin/adminApi', () => ({
  getSystemInfo: mockGetSystemInfo,
  updateSystemStorage: mockUpdateSystemStorage,
  validateSystemStorage: mockValidateSystemStorage,
  updateSystemEmbedUpdater: mockUpdateSystemEmbedUpdater,
}))

function createSystemResponse(overrides: Record<string, any> = {}) {
  return {
    storage: {
      mode: 'local',
      effectiveMode: 'local',
      readOnly: false,
      localPath: '/tmp/catalog',
      lastSyncedAt: '',
      webdav: {
        url: '',
        basePath: 'physicsAnimations',
        username: '',
        timeoutMs: 15000,
        hasPassword: false,
        scanRemote: false,
      },
      ...overrides.storage,
    },
    embedUpdater: {
      enabled: true,
      intervalDays: 20,
      lastCheckedAt: '',
      lastRunAt: '',
      lastSuccessAt: '',
      lastError: '',
      nextRunAt: '',
      lastSummary: {
        status: 'idle',
        ggbStatus: '',
        totalProfiles: 0,
        syncedProfiles: 0,
        skippedProfiles: 0,
        failedProfiles: 0,
      },
      ...overrides.embedUpdater,
    },
  }
}

export function resetSystemWizardApiMocks(overrides: Record<string, any> = {}) {
  mockGetSystemInfo.mockReset()
  mockUpdateSystemStorage.mockReset()
  mockValidateSystemStorage.mockReset()
  mockUpdateSystemEmbedUpdater.mockReset()

  mockGetSystemInfo.mockResolvedValue(createSystemResponse(overrides))
  mockUpdateSystemStorage.mockImplementation(async (payload: Record<string, any>) =>
    createSystemResponse({
      storage: {
        mode: payload.mode || 'local',
        effectiveMode: payload.mode || 'local',
        webdav: {
          url: payload.webdav?.url || '',
          basePath: payload.webdav?.basePath || 'physicsAnimations',
          username: payload.webdav?.username || '',
          timeoutMs: payload.webdav?.timeoutMs || 15000,
          hasPassword: Boolean(payload.webdav?.password),
          scanRemote: payload.webdav?.scanRemote === true,
        },
      },
    })
  )
  mockValidateSystemStorage.mockResolvedValue({})
  mockUpdateSystemEmbedUpdater.mockImplementation(async (payload: Record<string, any>) =>
    createSystemResponse({
      embedUpdater: {
        enabled: payload.enabled !== false,
        intervalDays: payload.intervalDays || 20,
      },
    })
  )
}

export async function mountSystemWizardHarness() {
  const { useSystemWizard } = await import('../../src/features/admin/system/useSystemWizard')

  let wizard!: ReturnType<typeof useSystemWizard>
  const WizardHarness = {
    setup() {
      wizard = useSystemWizard()
      return () => h('div')
    },
  }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: WizardHarness },
      { path: '/other', component: { render: () => h('div', 'other') } },
    ],
  })

  const host = document.createElement('div')
  document.body.appendChild(host)

  const app = createApp({
    render: () => h(RouterView),
  })

  app.use(router)
  await router.push('/')
  await router.isReady()
  app.mount(host)
  await nextTick()
  await nextTick()

  return {
    app,
    host,
    router,
    wizard,
    cleanup() {
      app.unmount()
      host.remove()
    },
  }
}
