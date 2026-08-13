<template>
  <aside class="flex h-full w-full flex-col gap-6 rounded-2xl border border-slate-200/80 bg-white p-6">
    <div class="border-b border-slate-100 pb-4">
      <h2 class="text-base font-bold text-slate-800">歌曲信息</h2>
    </div>

    <!-- 1. 歌曲元数据列表 -->
    <div class="grid grid-cols-2 gap-3">
      <SongMetaCard label="歌曲名称" v-model="inputTitleString" :show-edit-button="true" @save="submitTitleChange" />

      <SongMetaCard label="BPM" :model-value="bpmValue" :show-edit-button="true"
        :custom-edit-action="() => { isBpmModalOpen = true }" />

      <SongMetaCard label="Frame" :model-value="currentFrame" />

      <SongMetaCard label="Coord" :model-value="currentCoord.rounded" />

      <SongMetaCard label="延迟(Frame)" v-model="inputDelayString" :show-edit-button="true" input-type="number"
        @save="submitDelayChange" />
    </div>

    <MusicPlayer ref="playerRef" />

    <BpmEditModal v-model="isBpmModalOpen" />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/store/store.ts'
import BpmEditModal from './BpmEditModal.vue'
import SongMetaCard from './SongMetaCard.vue'
import MusicPlayer from './MusicPlayer.vue'

const appStore = useAppStore()

// 引入子组件的ref实例
const playerRef = ref<InstanceType<typeof MusicPlayer> | null>(null)

// --- 歌曲名称逻辑 ---
const inputTitleString = ref('')

watch(
  () => appStore.currentSong?.xmlObject?.TITLE?.Name,
  (val) => {
    inputTitleString.value = val || '未知'
  },
  { immediate: true },
)

const submitTitleChange = (val: any) => {
  const newName = String(val).trim()
  if (newName && appStore.currentSong?.xmlObject?.TITLE) {
    appStore.currentSong.xmlObject.TITLE.Name = newName
  } else {
    inputTitleString.value = appStore.currentSong?.xmlObject?.TITLE?.Name || '未知'
  }
}

// --- 延迟逻辑（保留在此处，因为受此处的卡片编辑驱动） ---
const inputDelayString = ref<string | number>('')

watch(
  () => appStore.currentSong?.xmlObject?.TITLE?.DELAY?.Value,
  (val) => {
    inputDelayString.value = val ?? 0
  },
  { immediate: true },
)

const submitDelayChange = (val: any) => {
  const parsed = parseFloat(String(val))
  const titleObj = appStore.currentSong?.xmlObject?.TITLE

  if (!isNaN(parsed) && titleObj) {
    if (!titleObj.DELAY) titleObj.DELAY = { Value: parsed + '' }
    else titleObj.DELAY.Value = parsed + ''
    inputDelayString.value = parsed
  } else {
    inputDelayString.value = titleObj?.DELAY?.Value ?? 0
  }
}

// --- BPM 弹窗 ---
const isBpmModalOpen = ref(false)

// --- 桥接子组件的数据供模板使用，并且用于对外暴露 ---
const seekTo = (target: number | string, type: 'time' | 'frame' | 'coord') => playerRef.value?.seekTo(target, type)
const currentTime = computed(() => playerRef.value?.currentTime ?? 0)
const currentFrame = computed(() => playerRef.value?.currentFrame ?? 0)
const currentCoord = computed(() => playerRef.value?.currentCoord ?? { raw: 0, rounded: 0 })
const playbackRate = computed(() => playerRef.value?.playbackRate ?? 1.0)
const pitchRate = computed(() => playerRef.value?.pitchRate ?? 1.0)
const bpmValue = computed(() => playerRef.value?.bpmValue ?? 120)
const isPlaying = computed(() => playerRef.value?.isPlaying ?? false)
const pause = () => playerRef.value?.pause()
const duration = computed(() => playerRef.value?.duration ?? 0)

// 继续向更外层的父级抛出原本暴露的所有方法和参数
defineExpose({
  seekTo,
  currentTime,
  currentFrame,
  currentCoord,
  playbackRate,
  pitchRate,
  bpmValue,
  inputDelayString, // 父组件直接托管该数据
  isPlaying,
  pause,
  duration,
})
</script>

<style scoped>
/* 无样式，之前的样式全部移至 MusicPlayer 中了 */
</style>