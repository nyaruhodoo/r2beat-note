<template>
  <!-- 隐藏的 audio 元素 -->
  <audio ref="audioRef" preload="auto" class="hidden"></audio>

  <!-- 音频播放器面板 -->
  <div
    class="relative flex flex-col gap-3 rounded-xl border border-slate-200/60 bg-linear-to-b from-slate-50 to-slate-100/50 p-3.5 shadow-inner">
    <!-- 音频合成 Loading 遮罩层 -->
    <div v-if="isAudioLoading"
      class="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-xs transition-opacity">
      <div class="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-md border border-slate-100">
        <svg class="h-4 w-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
        <span class="text-xs font-semibold text-slate-700">正在处理音轨音频...</span>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button type="button" :disabled="!isLoaded || isAudioLoading"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition-all hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        @click="togglePlay">
        <svg v-if="currentSongInfo.isPlaying" class="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>

        <svg v-else class="ml-0.5 h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      <div class="shrink-0 font-mono text-xs text-slate-500">
        <input v-if="isEditingTime" v-model="inputTimeString" type="text" v-focus
          class="w-22 rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-xs font-bold text-slate-800 shadow-xs focus:border-slate-500 focus:outline-hidden"
          placeholder="00:00.000" @keydown.enter="submitTimeChange" @keydown.esc="cancelTimeEdit"
          @blur="submitTimeChange" />

        <span v-else class="cursor-pointer font-bold text-slate-700 select-none hover:text-slate-900 hover:underline"
          title="双击指定跳转进度" @dblclick="handleDoubleClickTime">
          {{ formattedCurrentTime }}
        </span>

        <span class="mx-0.5 text-slate-300">/</span>

        <span>{{ formattedDuration }}</span>
      </div>

      <!-- 进度条容器：直接 v-model 绑定 currentSongInfo.currentTime -->
      <div class="min-w-16 flex-1 progress-slider-container">
        <el-slider v-model="currentSongInfo.currentTime" :max="currentSongInfo.duration" :step="0.001"
          :format-tooltip="formatTime" :show-tooltip="false" :disabled="!isLoaded || isAudioLoading" size="small"
          @input="handleSliderInput" @change="(val) => handleSeek(val as number)" />
      </div>

      <!-- 音轨管理弹出按钮 -->
      <TrackManagerPopover v-model:main-volume="mainVolume" v-model:backing-volumes="backingVolumes"
        class="ml-auto shrink-0" />

      <div class="group/volume relative flex shrink-0 items-center ml-auto">
        <button type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-800"
          @click="toggleMute">
          <svg v-if="globalConfigStore.musicVolume === 0" class="h-4.5 w-4.5" fill="none" stroke="currentColor"
            stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>

          <svg v-else class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.314M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>

        <div
          class="invisible absolute bottom-full left-1/2 -translate-x-1/2 pb-2 opacity-0 transition-all duration-200 group-hover/volume:visible group-hover/volume:opacity-100">
          <div
            class="volume-slider flex flex-col items-center rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-xs">
            <span class="mb-1.5 font-mono text-[10px] font-semibold text-slate-500">
              {{ Math.round(globalConfigStore.musicVolume * 100) }}%
            </span>
            <el-slider v-model="globalConfigStore.musicVolume" vertical height="80px" :min="0" :max="1" :step="0.01"
              :show-tooltip="false" size="small" />
          </div>
        </div>
      </div>
    </div>

    <!-- 速率与节拍控制区域 -->
    <div class="flex flex-col gap-2 border-t border-slate-200/50 pt-2">
      <!-- 1. Tempo: 变速不变调 -->
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-slate-500">节拍 (Tempo)</span>
        <div class="flex items-center gap-1.5">
          <el-input-number v-model="playbackRateSafe" class="w-24!" :min="0.1" :max="2.0" :step="0.1" :precision="1"
            :value-on-clear="1.0" size="small" />
          <button type="button" class="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors" title="复位到1.0"
            @click="playbackRateSafe = 1.0">
            ↺
          </button>
        </div>
      </div>

      <!-- 2. Rate: 变速又变调 -->
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-slate-500">速率 (Rate)</span>
        <div class="flex items-center gap-1.5">
          <el-input-number v-model="pitchRateSafe" class="w-24!" :min="0.1" :max="2.0" :step="0.1" :precision="1"
            :value-on-clear="1.0" size="small" />
          <button type="button" class="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors" title="复位到1.0"
            @click="pitchRateSafe = 1.0">
            ↺
          </button>
        </div>
      </div>

      <!-- 3. 快捷跳转: Frame / Coord -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <span class="text-xs font-medium text-slate-500">跳转</span>
          <select v-model="quickSeekType"
            class="rounded border border-slate-200 bg-transparent px-1 py-0.5 text-xs text-slate-600 focus:outline-hidden focus:border-slate-400">
            <option value="frame">Frame</option>
            <option value="coord">Coord</option>
          </select>
        </div>
        <div class="flex items-center gap-1.5">
          <el-input-number v-model="quickSeekValue" class="w-24!" :controls="false" size="small"
            @keydown.enter="handleQuickSeek" />
          <button type="button" :disabled="!isLoaded || isAudioLoading"
            class="rounded bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-0.5 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            @click="handleQuickSeek">
            GO
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect, onUnmounted } from 'vue'
import { useMagicKeys } from '@vueuse/core'
import { useAppStore, type BpmItem } from '@/store/store.ts'
import { useGlobalConfigStore } from '@/store/global-config.ts'
import { formatTime, getDecimalPlaces } from '@/utils/utils.ts'
import TrackManagerPopover from './TrackManagerPopover.vue'
import AudioWorker from '../audio-worker.ts?worker'

const { currentSong, currentSongInfo } = useAppStore()
const globalConfigStore = useGlobalConfigStore()

// --- Vite 标准语法初始化 Web Worker ---
const audioWorker = new AudioWorker()

// 音频处理 Loading 状态
const isAudioLoading = ref(false)
let currentTaskId = 0

// --- 音轨独立音量控制响应式变量 ---
const mainVolume = ref(1.0)
const backingVolumes = ref<number[]>([])

// --- 快捷跳转 ---
const quickSeekType = ref<'frame' | 'coord'>('frame')
const quickSeekValue = ref<number | undefined>(undefined)

const handleQuickSeek = () => {
  if (quickSeekValue.value === undefined || quickSeekValue.value === null || Number.isNaN(quickSeekValue.value)) return
  seekTo(quickSeekValue.value, quickSeekType.value)
}

// --- 延迟数据读取 ---
const delayFrames = computed<number>(() => {
  const val = currentSong?.xmlObject?.TITLE?.DELAY?.Value
  const parsed = parseFloat(String(val ?? '0'))
  return isNaN(parsed) ? 0 : parsed
})

const delaySeconds = computed(() => delayFrames.value / 60)

// --- 音频核心 DOM & 内部逻辑变量 ---
const audioRef = ref<HTMLAudioElement | null>(null)
const isLoaded = ref(false)
const isDragging = ref(false)

const playbackRate = ref(1.0)
const pitchRate = ref(1.0)

const sanitizeRate = (val: unknown, fallback = 1.0): number => {
  if (val === undefined || val === null || typeof val !== 'number' || Number.isNaN(val)) {
    return fallback
  }
  return Math.min(Math.max(val, 0.1), 4.0)
}

const playbackRateSafe = computed<number>({
  get: () => playbackRate.value,
  set: (val: number | undefined) => {
    if (val !== undefined && val !== null && !Number.isNaN(val)) {
      playbackRate.value = sanitizeRate(val)
      applyPitchAndRateConfig()

      if (currentSongInfo.isPlaying && audioCtx) {
        startOffset = currentSongInfo.currentTime
        startTimestamp = audioCtx.currentTime
      }
    }
  },
})

const pitchRateSafe = computed<number>({
  get: () => pitchRate.value,
  set: (val: number | undefined) => {
    if (val !== undefined && val !== null && !Number.isNaN(val)) {
      pitchRate.value = sanitizeRate(val)
      applyPitchAndRateConfig()

      if (currentSongInfo.isPlaying && audioCtx) {
        startOffset = currentSongInfo.currentTime
        startTimestamp = audioCtx.currentTime
      }
    }
  },
})

const combinedRate = computed(() => playbackRate.value * pitchRate.value)
const isAudioReady = ref(false)

let audioCtx: AudioContext | null = null
let mediaElementSource: MediaElementAudioSourceNode | null = null
let splitterNode: ChannelSplitterNode | null = null
let mergerNode: ChannelMergerNode | null = null
let trackGainNodes: GainNode[] = []
let masterGainNode: GainNode | null = null
let animationFrameId: number | null = null

let startTimestamp = 0
let startOffset = 0

const pause = () => {
  if (audioRef.value) {
    audioRef.value.pause()
  }
  currentSongInfo.isPlaying = false
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
}

const resetPlayback = () => {
  pause()
  currentSongInfo.currentTime = 0
  if (audioRef.value) {
    audioRef.value.currentTime = 0
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

watch(
  () => currentSong?.xmlObject?.TITLE?.BPM,
  () => {
    if (isLoaded.value && isAudioReady.value) {
      resetPlayback()
    }
  },
  { deep: true }
)

// --- 依赖于 currentTime 的核心派生计算 ---
const calculatedFrame = computed(() => {
  const raw = (currentSongInfo.currentTime ?? 0) * 60 - delayFrames.value
  return {
    raw,
    rounded: Number(raw.toFixed(getDecimalPlaces(globalConfigStore.stepCoord))),
  }
})

const sortedBpmList = computed<Array<{ frame: number; bpm: number }>>(() => {
  const bpmData = currentSong?.xmlObject?.TITLE?.BPM as BpmItem[] | BpmItem | undefined
  if (!bpmData) return [{ frame: 0, bpm: 120 }]
  const list: BpmItem[] = Array.isArray(bpmData) ? bpmData : [bpmData]
  if (list.length === 0) return [{ frame: 0, bpm: 120 }]
  const sorted = list
    .map((item) => {
      const parsedBpm = parseFloat(String(item.BPM))
      return {
        frame: Number(item.Frame) || 0,
        bpm: Number.isNaN(parsedBpm) ? 120 : parsedBpm,
      }
    })
    .sort((a, b) => a.frame - b.frame)
  if (sorted[0].frame > 0) sorted.unshift({ frame: 0, bpm: sorted[0].bpm })
  return sorted
})

const calculatedBpmValue = computed<number>(() => {
  const list = sortedBpmList.value
  const tf = calculatedFrame.value.raw
  if (tf < 0) return list[0]?.bpm
  for (let i = list.length - 1; i >= 0; i--) {
    if (tf >= list[i].frame) return list[i].bpm
  }
  return list[0]?.bpm
})

const bpmTimePoints = computed(() => {
  const list = sortedBpmList.value
  const timePoints = list.map((item) => ({
    time: (item.frame + delayFrames.value) / 60,
    bpm: item.bpm,
  }))
  if (timePoints.length > 0 && timePoints[0].time > 0) {
    timePoints.unshift({ time: 0, bpm: timePoints[0].bpm })
  }
  return timePoints
})

const calculatedCoord = computed(() => {
  const t = currentSongInfo.currentTime ?? 0
  const timePoints = bpmTimePoints.value
  let totalCoord = 0

  for (let i = 0; i < timePoints.length; i++) {
    const curr = timePoints[i]
    const next = timePoints[i + 1]
    const start = curr.time
    const end = next ? Math.min(t, next.time) : t
    if (t > start) {
      const segDuration = end - start
      if (segDuration > 0) {
        totalCoord += segDuration * (curr.bpm / 5)
      }
    }
    if (t <= end) break
  }
  return {
    raw: totalCoord,
    rounded: Number(totalCoord.toFixed(getDecimalPlaces(globalConfigStore.stepCoord))),
  }
})

// 监听并实时写回 currentSongInfo，保证与外部实时同步
watchEffect(() => {
  currentSongInfo.currentFrame = calculatedFrame.value
  currentSongInfo.currentCoord = calculatedCoord.value
  currentSongInfo.bpmValue = calculatedBpmValue.value
})

const getSecondsFromCoord = (targetCoord: number): number => {
  if (targetCoord <= 0) return 0
  const timePoints = bpmTimePoints.value
  if (timePoints.length === 0) return 0

  let accumulatedCoord = 0

  for (let i = 0; i < timePoints.length; i++) {
    const curr = timePoints[i]
    const next = timePoints[i + 1]
    const start = curr.time
    const rate = curr.bpm / 5

    if (!next) {
      if (rate === 0) return start
      const dt = (targetCoord - accumulatedCoord) / rate
      return Math.max(0, start + dt)
    }

    const segDuration = next.time - start
    const maxSegmentCoordChange = segDuration * rate
    const endCoord = accumulatedCoord + maxSegmentCoordChange

    if (rate > 0) {
      if (targetCoord >= accumulatedCoord && targetCoord <= endCoord) {
        return start + (targetCoord - accumulatedCoord) / rate
      }
    } else if (rate < 0) {
      if (targetCoord <= accumulatedCoord && targetCoord >= endCoord) {
        return start + (targetCoord - accumulatedCoord) / rate
      }
    } else {
      if (Math.abs(targetCoord - accumulatedCoord) < 1e-6) {
        return start
      }
    }

    accumulatedCoord = endCoord
  }

  return 0
}

const isEditingTime = ref(false)
const inputTimeString = ref('')

const vFocus = {
  mounted: (el: HTMLInputElement) => {
    el.focus()
    el.select()
  },
}

const lastVolume = ref(1.0)

// 重构音频 Graph 节点
const setupAudioNodes = (totalTracks: number) => {
  if (!audioCtx || !audioRef.value) return

  if (mediaElementSource) {
    try { mediaElementSource.disconnect() } catch { }
  }
  if (splitterNode) {
    try { splitterNode.disconnect() } catch { }
  }
  trackGainNodes.forEach((g) => {
    try { g.disconnect() } catch { }
  })
  trackGainNodes = []
  if (mergerNode) {
    try { mergerNode.disconnect() } catch { }
  }
  if (masterGainNode) {
    try { masterGainNode.disconnect() } catch { }
  }

  masterGainNode = audioCtx.createGain()
  masterGainNode.gain.value = globalConfigStore.musicVolume
  masterGainNode.connect(audioCtx.destination)

  if (!mediaElementSource) {
    mediaElementSource = audioCtx.createMediaElementSource(audioRef.value)
  }

  splitterNode = audioCtx.createChannelSplitter(totalTracks)
  mediaElementSource.connect(splitterNode)

  mergerNode = audioCtx.createChannelMerger(2)

  for (let i = 0; i < totalTracks; i++) {
    const trackGain = audioCtx.createGain()

    splitterNode.connect(trackGain, i, 0)
    trackGain.connect(mergerNode, 0, 0)
    trackGain.connect(mergerNode, 0, 1)

    trackGainNodes.push(trackGain)
  }

  mergerNode.connect(masterGainNode)
  updateTrackGains()
}

const updateTrackGains = () => {
  if (trackGainNodes[0]) {
    trackGainNodes[0].gain.value = mainVolume.value
  }
  backingVolumes.value.forEach((vol, idx) => {
    const gainIdx = idx + 1
    if (trackGainNodes[gainIdx]) {
      trackGainNodes[gainIdx].gain.value = vol
    }
  })
}

watch([mainVolume, backingVolumes], () => {
  updateTrackGains()
}, { deep: true })

// 监听 Worker 后台计算完成消息
audioWorker.onmessage = (e: MessageEvent) => {
  const { taskId, wavBuffer, duration: calcDuration, error } = e.data

  if (taskId !== currentTaskId) return

  if (error) {
    console.error('Worker 合成错误:', error)
    isAudioLoading.value = false
    isLoaded.value = false
    return
  }

  const blob = new Blob([wavBuffer], { type: 'audio/wav' })
  if (currentSongInfo.musicObjectUrl) {
    URL.revokeObjectURL(currentSongInfo.musicObjectUrl)
  }
  currentSongInfo.musicObjectUrl = URL.createObjectURL(blob)

  const totalTracks = (currentSong?.backingTracks?.length || 0) + 1
  setupAudioNodes(totalTracks)

  isAudioReady.value = false
  if (audioRef.value) {
    const el = audioRef.value
    el.onloadedmetadata = null
    applyPitchAndRateConfig()
    el.src = currentSongInfo.musicObjectUrl

    el.onloadedmetadata = () => {
      currentSongInfo.duration = el.duration
      isAudioReady.value = true
      if (!isFinite(currentSongInfo.duration) || currentSongInfo.duration <= 0) {
        currentSongInfo.duration = calcDuration
      }
      isAudioLoading.value = false
    }

    el.onended = () => {
      currentSongInfo.isPlaying = false
      currentSongInfo.currentTime = currentSongInfo.duration

      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }

  resetPlayback()
  isLoaded.value = true
}

audioWorker.onerror = (err) => {
  console.error('Audio Worker 出现异常:', err)
  isAudioLoading.value = false
}

// 核心：使用 Worker 异步合成音频
const buildAndApplyMultiChannelAudio = async () => {
  resetPlayback()

  const mainFile = currentSong?.audioFile
  const backingFiles = currentSong?.backingTracks || []

  if (!mainFile) {
    isLoaded.value = false
    return
  }

  const taskId = ++currentTaskId
  isAudioLoading.value = true

  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    const filesToDecode = [mainFile, ...backingFiles]
    const decodedBuffers: AudioBuffer[] = await Promise.all(
      filesToDecode.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        return await audioCtx!.decodeAudioData(arrayBuffer)
      })
    )

    if (taskId !== currentTaskId) return

    const transferables: Transferable[] = []
    const trackPayloads = decodedBuffers.map((buf) => {
      const channels: Float32Array[] = []
      for (let i = 0; i < buf.numberOfChannels; i++) {
        const copy = new Float32Array(buf.getChannelData(i))
        channels.push(copy)
        transferables.push(copy.buffer)
      }
      return {
        channels,
        length: buf.length,
        sampleRate: buf.sampleRate,
      }
    })

    audioWorker.postMessage(
      {
        taskId,
        tracks: trackPayloads,
        targetSampleRate: audioCtx.sampleRate,
        delayFrames: delayFrames.value,
        fixMusicDelay: Number(globalConfigStore.fixMusicDelay) || 0,
      },
      transferables
    )
  } catch (err) {
    console.error('多音轨音频解码失败:', err)
    if (taskId === currentTaskId) {
      isAudioLoading.value = false
      isLoaded.value = false
    }
  }
}

watch(
  [
    () => currentSong?.audioFile,
    () => currentSong?.backingTracks?.length,
    () => globalConfigStore.fixMusicDelay,
    delayFrames,
  ],
  () => {
    const backingLen = currentSong?.backingTracks?.length || 0
    while (backingVolumes.value.length < backingLen) {
      backingVolumes.value.push(0)
    }
    if (backingVolumes.value.length > backingLen) {
      backingVolumes.value = backingVolumes.value.slice(0, backingLen)
    }

    buildAndApplyMultiChannelAudio()
  },
  { immediate: true }
)

const applyPitchAndRateConfig = () => {
  if (!audioRef.value) return
  const el = audioRef.value

  const isDefaultPitch = Math.abs(pitchRate.value - 1.0) < 0.001
  el.preservesPitch = isDefaultPitch
    ; (el as any).webkitPreservesPitch = isDefaultPitch

  const safeCombinedRate = Math.min(Math.max(combinedRate.value, 0.0625), 16.0)
  el.playbackRate = safeCombinedRate
}

const playAt = async (offset: number) => {
  if (!audioRef.value || !audioCtx || isAudioLoading.value) return

  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume()
    } catch (e) {
      console.warn('AudioContext 恢复失败', e)
    }
  }

  if (offset >= currentSongInfo.duration - 0.01) {
    offset = 0
  }

  audioRef.value.currentTime = offset
  applyPitchAndRateConfig()

  startTimestamp = audioCtx.currentTime
  startOffset = offset

  const playPromise = audioRef.value.play()
  if (playPromise !== undefined) {
    playPromise.catch((e) => {
      console.warn('播放被阻止:', e)
      currentSongInfo.isPlaying = false
    })
  }

  currentSongInfo.isPlaying = true
  updateProgress()
}

const togglePlay = () => {
  if (!isLoaded.value || !audioRef.value || !isAudioReady.value || isAudioLoading.value) return
  if (currentSongInfo.isPlaying) {
    pause()
  } else {
    const el = audioRef.value
    const isAtEnd = el.currentTime >= currentSongInfo.duration - 0.05
    const startPos = isAtEnd ? 0 : el.currentTime
    playAt(startPos)
  }
}

useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.type !== 'keydown') return

    const activeElement = document.activeElement
    const isInputActive =
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).isContentEditable)

    if (isInputActive) return

    if (e.code === 'Space') {
      e.preventDefault()
      togglePlay()
      return
    }

    const key = e.key.toLowerCase()

    // 1. 节拍控制: q(降低) w(还原) e(增加)
    if (key === 'q') {
      e.preventDefault()
      playbackRateSafe.value = Math.max(0.1, Number((playbackRateSafe.value - 0.1).toFixed(1)))
    } else if (key === 'w') {
      e.preventDefault()
      playbackRateSafe.value = 1.0
    } else if (key === 'e') {
      e.preventDefault()
      playbackRateSafe.value = Math.min(2.0, Number((playbackRateSafe.value + 0.1).toFixed(1)))
    }

    // 2. 速率控制: a(降低) s(还原) d(增加)
    if (key === 'a') {
      e.preventDefault()
      pitchRateSafe.value = Math.max(0.1, Number((pitchRateSafe.value - 0.1).toFixed(1)))
    } else if (key === 's') {
      e.preventDefault()
      pitchRateSafe.value = 1.0
    } else if (key === 'd') {
      e.preventDefault()
      pitchRateSafe.value = Math.min(2.0, Number((pitchRateSafe.value + 0.1).toFixed(1)))
    }
  },
})

const updateProgress = () => {
  if (!currentSongInfo.isPlaying || !audioCtx) return

  if (!isDragging.value) {
    const elapsed = (audioCtx.currentTime - startTimestamp) * combinedRate.value
    currentSongInfo.currentTime = Math.min(startOffset + elapsed, currentSongInfo.duration)
  }

  if (currentSongInfo.currentTime < currentSongInfo.duration) {
    animationFrameId = requestAnimationFrame(updateProgress)
  } else {
    currentSongInfo.isPlaying = false
    currentSongInfo.currentTime = currentSongInfo.duration
  }
}

watch(
  () => globalConfigStore.musicVolume,
  (val) => {
    if (masterGainNode) {
      masterGainNode.gain.value = val
    }
  },
  { immediate: true }
)

const toggleMute = () => {
  if (globalConfigStore.musicVolume === 0) {
    globalConfigStore.musicVolume = lastVolume.value || 1.0
  } else {
    lastVolume.value = globalConfigStore.musicVolume || 1.0
    globalConfigStore.musicVolume = 0
  }
}

const handleSliderInput = () => {
  isDragging.value = true
}

const handleSeek = (val: number) => {
  if (isAudioLoading.value) return
  currentSongInfo.currentTime = val
  if (audioRef.value) {
    audioRef.value.currentTime = val
  }
  if (currentSongInfo.isPlaying && audioCtx) {
    startOffset = val
    startTimestamp = audioCtx.currentTime
  }
  isDragging.value = false
}

const parseTimeToSeconds = (str: string) => {
  const s = str.trim()
  if (!s) return null
  if (s.includes(':')) {
    const [mins, secs] = s.split(':').map(Number)
    if (isNaN(mins) || isNaN(secs)) return null
    return mins * 60 + secs
  }
  const val = parseFloat(s)
  return isNaN(val) ? null : val
}

const handleDoubleClickTime = () => {
  if (!isLoaded.value || isAudioLoading.value) return
  inputTimeString.value = formattedCurrentTime.value
  isEditingTime.value = true
}

const submitTimeChange = () => {
  if (!isEditingTime.value) return
  const inputDisplayTime = parseTimeToSeconds(inputTimeString.value)
  if (inputDisplayTime !== null) {
    const actualTime = inputDisplayTime + delaySeconds.value
    handleSeek(Math.max(0, Math.min(actualTime, currentSongInfo.duration)))
  }
  isEditingTime.value = false
}

const cancelTimeEdit = () => {
  isEditingTime.value = false
}

const formattedDuration = computed(() => formatTime(Math.max(0, (currentSongInfo.duration ?? 0) - delaySeconds.value)))
const formattedCurrentTime = computed(() => formatTime(Math.max(0, (currentSongInfo.currentTime ?? 0) - delaySeconds.value)))

const seekTo = (target: number | string, type: 'time' | 'frame' | 'coord') => {
  if (isAudioLoading.value) return
  let seconds: number | null = null
  if (type === 'frame') {
    const targetFrame = Number(target)
    if (!isNaN(targetFrame)) {
      seconds = (targetFrame + delayFrames.value) / 60
    }
  } else if (type === 'coord') {
    const targetCoord = Number(target)
    if (!isNaN(targetCoord)) {
      seconds = getSecondsFromCoord(targetCoord)
    }
  } else {
    const parsedDisplayTime = typeof target === 'number' ? target : parseTimeToSeconds(String(target))
    if (parsedDisplayTime !== null) {
      seconds = parsedDisplayTime + delaySeconds.value
    }
  }

  if (seconds !== null && !isNaN(seconds)) {
    handleSeek(Math.max(0, Math.min(seconds, currentSongInfo.duration)))
  }
}

// 组件仅暴露 seekTo 与 pause
defineExpose({
  seekTo,
  pause,
})

onUnmounted(() => {
  pause()
  audioWorker.terminate()
  if (currentSongInfo.musicObjectUrl) URL.revokeObjectURL(currentSongInfo.musicObjectUrl)
  if (mediaElementSource) {
    mediaElementSource.disconnect()
    mediaElementSource = null
  }
  audioCtx?.close()
})
</script>