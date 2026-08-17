<template>
  <!-- 1. 最外层 div 挂载 v-loading 指令 -->
  <div v-loading="comLoading" class="flex h-screen w-full flex-col bg-slate-100 p-6">
    <!-- 使用抽离后的 Header 组件 -->
    <NoteEditorHeader :loading="loading" />

    <!-- 2. 加载未完成时不渲染核心编辑区域 -->
    <div v-if="!comLoading" class="flex flex-1 gap-6 overflow-hidden">
      <!-- 左侧：歌曲信息 -->
      <div class="flex-1">
        <SongInfoPanel ref="songInfoPanelRef" />
      </div>

      <!-- 中间：直接在模板里组装对象，Vue 会自动深度解包 ref 保持响应式 -->
      <RhythmCanvas :style="{
        width: globalConfigStore.canvasWidth + 'px'
      }" v-if="songInfoPanelRef" :seek-to="songInfoPanelRef?.seekTo" :key="globalConfigStore.canvasWidth" />

      <!-- 右侧：音频可视化区域 -->
      <div class="flex-1">
        <SongVisualization :seek-to="songInfoPanelRef?.seekTo" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, toRaw, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRefHistory, onKeyStroke } from '@vueuse/core'

import NoteEditorHeader from '@/components/NoteEditorHeader.vue'
import SongVisualization from '@/components/SongVisualization.vue'
import RhythmCanvas from '@/components/RhythmCanvas.vue'
import SongInfoPanel from '@/components/SongInfoPanel.vue'
import { useAppStore } from '@/store/store'
import { useSongStorage } from '@/db/useSongStorage'
import { deepToRaw } from '@/utils/utils'
import { useGlobalConfigStore } from '@/store/global-config'

const route = useRoute()
const appStore = useAppStore()
const globalConfigStore = useGlobalConfigStore()
const songInfoPanelRef = ref<InstanceType<typeof SongInfoPanel> | null>(null)
const comLoading = ref(true)
const { loading, getSongById, updateSong } = useSongStorage()
const id = Number(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id)

// ==================== 历史记录与撤回重做逻辑 ====================
const areaRef = computed({
  get: () => appStore.currentSong?.xmlObject?.TITLE.AREA,
  set: (val) => {
    if (appStore.currentSong?.xmlObject) {
      appStore.currentSong.xmlObject.TITLE.AREA = val!
    }
  }
})

// 仅记录 xmlObject 的变化历史
const { undo, redo, clear } = useRefHistory(areaRef, {
  deep: true,
  // 仅对 xmlObject 纯 JavaScript 对象执行深拷贝，性能高且不会触发 DataCloneError
  clone: (val) => {
    if (!val) return
    return structuredClone(deepToRaw(val))
  }
})

// 监听键盘快捷键：Ctrl/Cmd + Z (撤回), Ctrl/Cmd + Y 或 Ctrl/Cmd + Shift + Z (重做)
onKeyStroke((e: KeyboardEvent) => {
  // 当用户在输入框/文本域中编辑时，保留原生的文本撤回行为
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return
  }

  const isCtrlOrCmd = e.ctrlKey || e.metaKey
  if (!isCtrlOrCmd) return

  const key = e.key.toLowerCase()

  if (key === 'z') {
    if (e.shiftKey) {
      e.preventDefault()
      redo()
    } else {
      e.preventDefault()
      undo()
    }
  } else if (key === 'y') {
    e.preventDefault()
    redo()
  }
})
// ================================================================

// 监听初始加载完毕
watch(
  [loading],
  async () => {
    if (!loading.value) {
      const song = await getSongById(id)
      if (song) {
        appStore.setCurrentSong(song)
        // 3. 等待 Vue 响应式依赖全部更新完毕
        await nextTick()
        clear() // 初始数据加载完成后清空历史栈，防止撤回至 null 状态
        comLoading.value = false
      }
    }
  },
  { immediate: true }
)

// 监听数据变化同步数据库
watch(
  () => appStore.currentSong,
  (newSong, oldSong) => {
    if (newSong && oldSong) {
      // 1. toRaw 获取当前 Song 的原始普通对象
      const rawSong = toRaw(newSong)

      // 2. 组合为纯净数据结构，既支持 File 存储，也不会触发 DataCloneError
      const cleanData = {
        ...rawSong,
        audioFile: toRaw(rawSong.audioFile),
        backingTracks: (rawSong.backingTracks || []).map(f => toRaw(f)),
        xmlObject: deepToRaw(rawSong.xmlObject)
      }

      updateSong(newSong.id, cleanData)
    }
  },
  { deep: true }
)

onUnmounted(() => {
  appStore.$reset()
}) 
</script>