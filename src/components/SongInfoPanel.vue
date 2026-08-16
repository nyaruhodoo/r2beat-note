<template>
  <aside class="flex h-full w-full flex-col gap-6 rounded-2xl border border-slate-200/80 bg-white p-6">

    <!-- 1. 歌曲元数据列表 -->
    <div class="grid grid-cols-2 gap-3">
      <!-- <SongMetaCard v-model="songTitle" label="歌曲名称" :show-edit-button="true" /> -->

      <SongMetaCard label="BPM" :model-value="appStore.currentSongInfo.bpmValue" :show-edit-button="true"
        :custom-edit-action="() => { isBpmModalOpen = true }" />
      <SongMetaCard v-model="songDelay" label="延迟(Frame)" :show-edit-button="true" input-type="number" />


      <SongMetaCard label="Frame" :model-value="appStore.currentSongInfo.currentFrame.rounded" />

      <SongMetaCard label="Coord" :model-value="appStore.currentSongInfo.currentCoord.rounded" />

    </div>

    <div class="flex flex-1 items-center justify-center">
      <ObstacleSelector></ObstacleSelector>
    </div>

    <MusicPlayer ref="playerRef" />

    <BpmEditModal v-model="isBpmModalOpen" />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/store/store.ts'
import BpmEditModal from './BpmEditModal.vue'
import SongMetaCard from './SongMetaCard.vue'
import MusicPlayer from './MusicPlayer.vue'
import ObstacleSelector from './ObstacleSelector.vue';


const appStore = useAppStore()

// 引入子组件的ref实例
const playerRef = ref<InstanceType<typeof MusicPlayer> | null>(null)

// --- 歌曲名称逻辑 (通过计算属性安全读写) ---
// const songTitle = computed<string>({
//   get() {
//     return appStore.currentSong?.xmlObject?.TITLE?.Name ?? '未知'
//   },
//   set(val) {
//     const titleObj = appStore.currentSong?.xmlObject?.TITLE
//     if (titleObj) {
//       titleObj.Name = String(val).trim()
//     }
//   },
// })

// --- 延迟逻辑 (通过计算属性安全读写) ---
const songDelay = computed<number>({
  get() {
    const rawVal = appStore.currentSong?.xmlObject?.TITLE?.DELAY?.Value
    if (!rawVal) return 0
    const parsed = Number(rawVal)
    return isNaN(parsed) ? 0 : parsed
  },
  set(val) {
    const titleObj = appStore.currentSong?.xmlObject?.TITLE
    if (!titleObj) return

    const numVal = Number(val)
    if (isNaN(numVal)) return

    if (!titleObj.DELAY) {
      titleObj.DELAY = { Value: String(numVal) }
    } else {
      titleObj.DELAY.Value = String(numVal)
    }
  },
})

// --- BPM 弹窗 ---
const isBpmModalOpen = ref(false)

// --- 桥接子组件的数据供模板使用，并且用于对外暴露 ---
const seekTo = (target: number | string, type: 'time' | 'frame' | 'coord') => playerRef.value?.seekTo(target, type)
const pause = () => playerRef.value?.pause()

// 继续向更外层的父级抛出原本暴露的所有方法和参数
defineExpose({
  seekTo,
  pause,
})
</script>
