import { createWebHashHistory, createRouter } from 'vue-router'

import Home from './pages/Home.vue'
import ImportMusic from './pages/ImportMusic.vue'
import NewMusic from './pages/NewMusic.vue'
import NoteEditor from './pages/NoteEditor.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/new-music', component: NewMusic },
  { path: '/note-editor', component: NoteEditor },
  { path: '/import-music', component: ImportMusic },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
