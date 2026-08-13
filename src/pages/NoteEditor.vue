<template>
  <!-- 1. 最外层 div 挂载 v-loading 指令 -->
  <div v-loading="comLoading" class="flex h-screen w-full flex-col bg-slate-100 p-6">
    <header class="mb-4 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-6 py-3">
      <div class="flex items-center gap-3">
        <el-button circle @click="router.back()" class="border-none">
          <el-icon>
            <Back />
          </el-icon>
        </el-button>
        <h1 class="text-lg font-bold text-slate-800">谱面编辑器</h1>
      </div>
      <div class="flex items-center gap-3">
        <el-button type="primary" :disabled="loading" @click="handleSaveXml">导出谱面</el-button>
      </div>
    </header>

    <!-- 2. 加载未完成时不渲染核心编辑区域 -->
    <div v-if="!comLoading" class="flex flex-1 gap-6 overflow-hidden">
      <!-- 左侧：歌曲信息 -->
      <div class="min-w-70 flex-1">
        <SongInfoPanel ref="songInfoPanelRef" />
      </div>

      <!-- 中间：直接在模板里组装对象，Vue 会自动深度解包 ref 保持响应式 -->
      <RhythmCanvas v-if="songInfoPanelRef" :current-time="songInfoPanelRef?.currentTime"
        :current-frame="songInfoPanelRef?.currentFrame" :current-coord="songInfoPanelRef?.currentCoord"
        :playback-rate="songInfoPanelRef?.playbackRate" :bpm="songInfoPanelRef?.bpmValue"
        :seek-to="songInfoPanelRef?.seekTo" :isPlaying="songInfoPanelRef?.isPlaying" :pause="songInfoPanelRef?.pause"
        :duration="songInfoPanelRef?.duration" />

      <!-- 右侧：障碍物选择器 -->
      <div class="min-w-120 flex-1">
        <ObstacleSelector />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, toRaw, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { XMLBuilder } from 'fast-xml-parser'
import { ElMessage } from 'element-plus'
import iconv from 'iconv-lite'
import { Buffer } from 'buffer'
import { useRefHistory, onKeyStroke } from '@vueuse/core'

import ObstacleSelector from '@/components/ObstacleSelector.vue'
import RhythmCanvas from '@/components/RhythmCanvas.vue'
import SongInfoPanel from '@/components/SongInfoPanel.vue'
import { useAppStore } from '@/store/store'
import { useSongStorage } from '@/db/useSongStorage'
import { deepToRaw } from '@/utils/utils'

// @ts-expect-error iconv需要这个东西
window.Buffer = Buffer

const route = useRoute()
const appStore = useAppStore()
const router = useRouter()
const songInfoPanelRef = ref<InstanceType<typeof SongInfoPanel> | null>(null)
const comLoading = ref(true)
const { loading, getSongById, updateSong } = useSongStorage()
const id = Number(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id)

// ==================== 历史记录与撤回重做逻辑 ====================
// 使用 computed 将历史记录精确限定在 appStore.currentSong.xmlObject.AREA 上
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
    if (loading) {
      const song = await getSongById(id)
      if (song) {
        appStore.setCurrentSong(song)
        clear() // 初始数据加载完成后清空历史栈，防止撤回至 null 状态
        comLoading.value = false
      }
    }
  },
  { immediate: true }
)

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
  appStore.currentSong = null
  appStore.selectedCoords.clear()
})

const handleSaveXml = () => {
  const xmlObj = appStore.currentSong?.xmlObject

  if (!xmlObj) {
    ElMessage.error('没有可保存的谱面数据！')
    return
  }

  try {
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      format: true,
      indentBy: '',
      suppressEmptyNode: false,
    })

    let rawXmlString = builder.build(xmlObj)

    // 2. 将字符串转换为 EUC-KR 编码的 Buffer
    const eucKrBuffer = iconv.encode(rawXmlString, 'euc-kr')

    // 3. 使用 Buffer 生成指定 charset 的 Blob
    const blob = new Blob([eucKrBuffer], { type: 'application/xml;charset=euc-kr' })

    const titleObj = xmlObj.TITLE
    const fileName = titleObj?.Name

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName}.xml`
    document.body.appendChild(link)
    link.click()

    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    ElMessage.success('谱面导出成功！')
  } catch (error) {
    console.error('保存 XML 失败:', error)
    ElMessage.error('谱面导出失败，请检查控制台输出')
  }
}
</script>