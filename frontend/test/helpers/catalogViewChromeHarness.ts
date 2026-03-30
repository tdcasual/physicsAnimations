import { createApp, h, nextTick, ref } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { vi } from 'vitest'
import { useCatalogViewChrome } from '../../src/views/useCatalogViewChrome'

export async function mountCatalogViewChromeHarness(
  options: {
    initialPath?: string
    loading?: boolean
    loadError?: string
    heroTitle?: string
  } = {}
) {
  const loading = ref(options.loading ?? false)
  const loadError = ref(options.loadError ?? '')
  const heroTitle = ref(options.heroTitle ?? '目录')
  const selectGroup = vi.fn()
  const selectCategory = vi.fn()

  let chrome!: ReturnType<typeof useCatalogViewChrome>

  const CatalogHarness = {
    setup() {
      chrome = useCatalogViewChrome({
        loading,
        loadError,
        heroTitle,
        selectGroup,
        selectCategory,
      })
      return () =>
        h('section', [
          h('button', { ref: chrome.mobileFilterTriggerRef, id: 'catalog-trigger' }),
          h('div', { ref: chrome.mobileFilterPanelRef, id: 'catalog-panel' }),
        ])
    },
  }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: CatalogHarness },
      { path: '/viewer/:id', component: { render: () => h('div', 'viewer') } },
      { path: '/library/folder/:id', component: { render: () => h('div', 'folder') } },
    ],
  })

  const host = document.createElement('div')
  document.body.appendChild(host)

  const app = createApp({
    render: () => h(RouterView),
  })

  app.use(router)
  await router.push(options.initialPath ?? '/')
  await router.isReady()
  app.mount(host)
  await nextTick()
  await nextTick()

  return {
    app,
    host,
    router,
    loading,
    loadError,
    heroTitle,
    chrome,
    selectGroup,
    selectCategory,
    cleanup() {
      app.unmount()
      host.remove()
    },
  }
}
