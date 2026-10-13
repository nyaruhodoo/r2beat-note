<template>
  <!-- 1. 最外层 div 挂载 v-loading 指令 -->
  <div v-loading="comLoading" class="h-screen w-full overflow-hidden">
    <!-- 2. 加载未完成时不渲染核心编辑区域 -->
    <ResponsiveEditorLayout v-if="!comLoading">
      <!-- Header 插槽 -->
      <template #header>
        <NoteEditorHeader :loading="loading" />
      </template>

      <!-- 左侧插槽：歌曲信息 -->
      <template #left>
        <SongInfoPanel />
      </template>

      <!-- 中间插槽：画布与移动端控制面板 -->
      <template #center>
        <div class="relative flex h-full w-full flex-col overflow-hidden">
          <!-- 上部分：画布滚动与展示区域（设为 relative 以供左侧悬浮组件定位） -->
          <div class="relative flex w-full flex-1 items-center justify-center overflow-hidden">
            <!-- 浮在上层、左侧对齐、受父级高度限制且自身滚动的 ObstacleSelector 组件 -->
            <ObstacleSelector
              class="absolute top-4 left-10 z-10 max-h-full overflow-y-auto"
              v-if="isTouchDevice"
            />

            <RhythmCanvas
              :style="{
                width: isTouchDevice ? '100%' : globalConfigStore.canvasWidth + 'px',
              }"
              :key="globalConfigStore.canvasWidth"
            />
          </div>

          <!-- 下部分：如果是触屏设备，则在底部固定渲染 MobileActionPanel 组件 -->
          <MobileActionPanel v-if="isTouchDevice" />
        </div>
      </template>

      <!-- 右侧插槽：配置区域 -->
      <template #right>
        <SongVisualization />
      </template>
    </ResponsiveEditorLayout>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery, useRefHistory } from '@vueuse/core'
import { computed, nextTick, onUnmounted, ref, toRaw, watch } from 'vue'
import { useRoute } from 'vue-router'

import MobileActionPanel from '@/components/MobileActionPanel.vue'
import NoteEditorHeader from '@/components/NoteEditorHeader.vue'
import ObstacleSelector from '@/components/ObstacleSelector.vue'
import ResponsiveEditorLayout from '@/components/ResponsiveEditorLayout.vue'
import RhythmCanvas from '@/components/RhythmCanvas.vue'
import SongInfoPanel from '@/components/SongInfoPanel.vue'
import SongVisualization from '@/components/SongVisualization.vue'
import { useSongStorage } from '@/db/useSongStorage'
import { useGlobalConfigStore } from '@/store/global-config'
import { useAppStore } from '@/store/store'
import { emitter } from '@/utils/eventBus'
import { deepToRaw } from '@/utils/utils'

const route = useRoute()
const appStore = useAppStore()
const globalConfigStore = useGlobalConfigStore()
const comLoading = ref(true)
const { loading, getSongById, updateSong } = useSongStorage()
const isTouchDevice = useMediaQuery('(pointer: coarse)')
const id = Number(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id)

// ==================== 历史记录与撤回重做逻辑 ====================
const areaRef = computed({
  get: () => appStore.currentSong?.xmlObject?.TITLE.AREA,
  set: (val) => {
    if (appStore.currentSong?.xmlObject) {
      appStore.currentSong.xmlObject.TITLE.AREA = val!
    }
  },
})

// 仅记录 xmlObject 的变化历史
const { undo, redo, clear } = useRefHistory(areaRef, {
  deep: true,
  // 仅对 xmlObject 纯 JavaScript 对象执行深拷贝，性能高且不会触发 DataCloneError
  clone: (val) => {
    if (!val) return
    return structuredClone(deepToRaw(val))
  },
})

// 监听 mitt 派发的撤回/重做事件
const handleUndo = () => {
  undo()
}

const handleRedo = () => {
  redo()
}

emitter.on('undo', handleUndo)
emitter.on('redo', handleRedo)
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
  { immediate: true },
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
        backingTracks: (rawSong.backingTracks || []).map((f) => toRaw(f)),
        xmlObject: deepToRaw(rawSong.xmlObject),
      }

      updateSong(newSong.id, cleanData)
    }
  },
  { deep: true },
)

onUnmounted(() => {
  emitter.off('undo', handleUndo)
  emitter.off('redo', handleRedo)
  appStore.$reset()
})
</script>
