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
