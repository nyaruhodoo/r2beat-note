import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import './style.css'
import 'element-plus/dist/index.css'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'

import App from './App.vue'
import { router } from './router.ts'

/**
 * 全局禁用右键菜单
 */
document.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)
app.use(router)
app.use(pinia)
app.mount('#app')

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
