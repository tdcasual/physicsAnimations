import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { vLazy } from './directives'
import { i18n } from './i18n'

// 设计系统（顺序很重要）
import './styles/design-system.css'
import './styles/a11y.css'
import './styles/breakpoints.css'
import './styles/mobile-optimizations.css'
import './styles.css'

// 工具
import { setupFocusVisible } from './utils/a11y'
import { initSentry, initWebVitals, captureException } from './monitoring'

const app = createApp(App)

// 初始化 Sentry（必须在其他插件之前）
initSentry(app)

app.use(createPinia())
app.use(router)
app.use(i18n)

// 注册全局指令
app.directive('lazy', vLazy)

app.mount('#app')

// 初始化 Web Vitals 监控
initWebVitals()

// 初始化焦点可见性检测
setupFocusVisible()

// 注册全局错误处理器
window.addEventListener('error', (event) => {
  // eslint-disable-next-line no-console
  console.error('Global error:', event.error)
  captureException(event.error instanceof Error ? event.error : new Error(String(event.error)), {
    type: 'window.onerror',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  })
})

window.addEventListener('unhandledrejection', (event) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled promise rejection:', event.reason)
  const error = event.reason instanceof Error
    ? event.reason
    : new Error(String(event.reason))
  captureException(error, { type: 'unhandledrejection' })
})

// 注册 PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        // eslint-disable-next-line no-console
        console.log('SW registered:', registration.scope)

        // 监听 Service Worker 更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 有新版本可用
                // eslint-disable-next-line no-console
                console.log('New version available')
                // 可以在这里触发更新提示
              }
            })
          }
        })
      })
      .catch(error => {
        // eslint-disable-next-line no-console
        console.log('SW registration failed:', error)
      })
  })
}
