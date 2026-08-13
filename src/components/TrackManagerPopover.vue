<template>
  <el-popover transition="fast-popover" placement="top" :width="340" trigger="click" teleport-to="body"
    popper-class="track-manager-popover !p-0 !rounded-xl !border-slate-200 !shadow-xl">
    <template #reference>
      <button type="button"
        class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-800"
        title="音轨管理">
        <el-icon :size="18">
          <Operation />
        </el-icon>
      </button>
    </template>

    <!-- 弹窗内部面板 -->
    <div class="flex flex-col gap-3 p-3.5 bg-white text-slate-800 rounded-xl overflow-hidden"
      @dragover.prevent="isDraggingOver = true" @dragleave.prevent="isDraggingOver = false" @drop.prevent="handleDrop">
      <div class="flex items-center justify-between border-b border-slate-100 pb-2">
        <span class="text-xs font-bold text-slate-700">多音轨管理</span>
      </div>

      <!-- 音轨列表 -->
      <div class="flex flex-col gap-2 max-h-56 overflow-y-auto overflow-x-hidden pr-2.5">
        <!-- 主音轨：默认 100% -->
        <div v-if="appStore.currentSong?.audioFile"
          class="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-xs border border-slate-100 w-full min-w-0">
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            <span class="shrink-0 rounded bg-indigo-100 px-1 py-0.5 text-[10px] font-bold text-indigo-600">主音轨</span>
            <span class="truncate min-w-0 font-medium text-slate-700" :title="appStore.currentSong.audioFile.name">
              {{ appStore.currentSong.audioFile.name }}
            </span>
          </div>

          <!-- 音量控制与一键静音 -->
          <div class="flex items-center gap-1 shrink-0">
            <!-- 占位块，确保与副音轨的删除按钮结构对齐 -->
            <div class="w-6 h-6 shrink-0"></div>

            <button type="button"
              class="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
              :title="localMainVolume === 0 ? '取消静音' : '静音'" @click="toggleMainMute">
              <svg v-if="localMainVolume === 0" class="h-3.5 w-3.5 text-rose-500" fill="none" stroke="currentColor"
                stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
              <svg v-else class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
            <div class="w-16">
              <el-slider v-model="localMainVolume" :min="0" :max="1" :step="0.01" size="small" :show-tooltip="true"
                :format-tooltip="formatTooltip" />
            </div>
          </div>
        </div>

        <!-- 副音轨列表：默认 0% -->
        <template v-if="appStore.currentSong?.backingTracks?.length">
          <div v-for="(track, index) in appStore.currentSong.backingTracks" :key="index"
            class="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-xs border border-slate-100 w-full min-w-0">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="shrink-0 rounded bg-slate-200 px-1 py-0.5 text-[10px] font-bold text-slate-600">副音轨</span>
              <span class="truncate min-w-0 font-medium text-slate-700" :title="track.name">
                {{ track.name }}
              </span>
            </div>

            <!-- 音量控制、静音与删除按钮 -->
            <div class="flex items-center gap-1 shrink-0">
              <!-- 删除音轨按钮（前置放置） -->
              <button type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                title="删除音轨" @click="removeBackingTrack(index)">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <button type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                :title="localBackingVolumes[index] === 0 ? '取消静音' : '静音'" @click="toggleBackingMute(index)">
                <svg v-if="localBackingVolumes[index] === 0" class="h-3.5 w-3.5 text-rose-500" fill="none"
                  stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
                <svg v-else class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>

              <div class="w-16">
                <el-slider v-model="localBackingVolumes[index]" :min="0" :max="1" :step="0.01" size="small"
                  :show-tooltip="true" :format-tooltip="formatTooltip" />
              </div>
            </div>
          </div>
        </template>

        <!-- 无音轨提示(需要吗？？？确信) -->
        <div v-if="!appStore.currentSong?.audioFile && !appStore.currentSong?.backingTracks?.length"
          class="py-4 text-center text-xs text-slate-400">
          暂无音轨文件
        </div>
      </div>

      <!-- 上传/拖拽区域 -->
      <div
        class="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-3 transition-colors"
        :class="isDraggingOver ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'">
        <input type="file" accept="audio/*" multiple class="absolute inset-0 cursor-pointer opacity-0"
          @change="handleFileSelect" />
        <div class="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>点击或拖拽上传音频</span>
        </div>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Operation } from '@element-plus/icons-vue'
import { useAppStore } from '@/store/store.ts'

const appStore = useAppStore()

const props = withDefaults(
  defineProps<{
    mainVolume?: number
    backingVolumes?: number[]
  }>(),
  {
    mainVolume: 1.0,
    backingVolumes: () => [],
  }
)

const emit = defineEmits<{
  (e: 'update:mainVolume', val: number): void
  (e: 'update:backingVolumes', val: number[]): void
}>()

const isDraggingOver = ref(false)

// 双向绑定的本地状态
const localMainVolume = ref(props.mainVolume)
const localBackingVolumes = ref<number[]>([...props.backingVolumes])

// 备份上一次非 0 音量用于取消静音恢复
const lastMainVolume = ref(1.0)
const lastBackingVolumes = ref<number[]>([])

// 监听 Props 变化同步至本地 (增加数值比对，切断死循环)
watch(
  () => props.mainVolume,
  (val) => {
    if (val !== localMainVolume.value) {
      localMainVolume.value = val
    }
  }
)

watch(
  () => props.backingVolumes,
  (newVal) => {
    const isDifferent =
      newVal.length !== localBackingVolumes.value.length ||
      newVal.some((v, i) => v !== localBackingVolumes.value[i])

    if (isDifferent) {
      localBackingVolumes.value = [...newVal]
    }
  },
  { deep: true }
)

// 本地改动向上 Emit 通知父组件
watch(localMainVolume, (val) => emit('update:mainVolume', val))
watch(localBackingVolumes, (val) => emit('update:backingVolumes', [...val]), { deep: true })

const formatTooltip = (val: number) => `${Math.round(val * 100)}%`

// 静音切换
const toggleMainMute = () => {
  if (localMainVolume.value === 0) {
    localMainVolume.value = lastMainVolume.value || 1.0
  } else {
    lastMainVolume.value = localMainVolume.value
    localMainVolume.value = 0
  }
}

const toggleBackingMute = (index: number) => {
  if (localBackingVolumes.value[index] === 0) {
    localBackingVolumes.value[index] = lastBackingVolumes.value[index] || 1.0
  } else {
    lastBackingVolumes.value[index] = localBackingVolumes.value[index]
    localBackingVolumes.value[index] = 0
  }
}

// 删除副音轨
const removeBackingTrack = (index: number) => {
  if (!appStore.currentSong?.backingTracks) return

  // 1. 从 Store 中移除 File 对象
  appStore.currentSong.backingTracks.splice(index, 1)

  // 2. 同步移除本地音量状态
  localBackingVolumes.value.splice(index, 1)
  if (lastBackingVolumes.value.length > index) {
    lastBackingVolumes.value.splice(index, 1)
  }
}

// 处理上传追加至 store
const processAudioFiles = (files: FileList | File[]) => {
  if (!appStore.currentSong) return
  if (!appStore.currentSong.backingTracks) {
    appStore.currentSong.backingTracks = []
  }

  Array.from(files).forEach((file) => {
    if (file.type.startsWith('audio/')) {
      appStore.currentSong!.backingTracks.push(file)
    }
  })
}

const handleDrop = (e: DragEvent) => {
  isDraggingOver.value = false
  if (e.dataTransfer?.files) {
    processAudioFiles(e.dataTransfer.files)
  }
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) {
    processAudioFiles(target.files)
    target.value = ''
  }
}
</script>

<style>
/* 自定义快速 Popover 动画，提升淡入淡出速度 */
.fast-popover-enter-active,
.fast-popover-leave-active {
  transition: opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.fast-popover-enter-from,
.fast-popover-leave-to {
  opacity: 0 !important;
  transform: scale(0.95) translateY(4px) !important;
}
</style>