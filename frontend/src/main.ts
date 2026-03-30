import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { vLazy } from './directives'

// 设计系统（顺序很重要）
import './styles/design-system.css'
import './styles.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 注册全局指令
app.directive('lazy', vLazy)

app.mount('#app')

// 注册 PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('SW registered:', registration.scope)

        // 监听 Service Worker 更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 有新版本可用
                console.log('New version available')
                // 可以在这里触发更新提示
              }
            })
          }
        })
      })
      .catch(error => {
        console.log('SW registration failed:', error)
      })
  })
}
