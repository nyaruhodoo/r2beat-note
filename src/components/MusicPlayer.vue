<template>
  <!-- 隐藏的 audio 元素 -->
  <audio ref="audioRef" preload="auto" class="hidden"></audio>

  <!-- 2. 音频播放器面板 -->
  <div
    class="mt-auto flex flex-col gap-3 rounded-xl border border-slate-200/60 bg-linear-to-b from-slate-50 to-slate-100/50 p-3.5 shadow-inner">
    <div class="flex items-center gap-3">
      <button type="button" :disabled="!isLoaded"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition-all hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        @click="togglePlay">
        <svg v-if="isPlaying" class="h-4 w-4 fill-current" viewBox="0 0 24 24">
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

      <!-- 进度条容器，小屏幕隐藏 -->
      <div class="min-w-16 flex-1 progress-slider-container">
        <el-slider v-model="currentTime" :max="duration" :step="0.001" :format-tooltip="formatTime" :show-tooltip="true"
          :disabled="!isLoaded" size="small" @input="handleSliderInput" @change="(val) => handleSeek(val as number)" />
      </div>

      <div class="group/volume relative flex shrink-0 items-center ml-auto">
        <button type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-800"
          @click="toggleMute">
          <!-- 静音状态：音量==0 或 muted 显示禁止图标，否则显示音量图标 -->
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
          <el-input-number v-model="playbackRateSafe" class="w-24!" :min="0.1" :max="4.0" :step="0.1" :precision="1"
            :value-on-clear="1.0" size="small" />
          <button type="button" class="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
            @click="playbackRateSafe = 1.0" title="复位到1.0">
            ↺
          </button>
        </div>
      </div>

      <!-- 2. Rate: 变速又变调 -->
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-slate-500">速率 (Rate)</span>
        <div class="flex items-center gap-1.5">
          <el-input-number v-model="pitchRateSafe" class="w-24!" :min="0.1" :max="4.0" :step="0.1" :precision="1"
            :value-on-clear="1.0" size="small" />
          <button type="button" class="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
            @click="pitchRateSafe = 1.0" title="复位到1.0">
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
          <button type="button" :disabled="!isLoaded"
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useMagicKeys } from '@vueuse/core'
import { useAppStore, type BpmItem } from '@/store/store.ts'
import { useGlobalConfigStore } from '@/store/global-config.ts'
import { getDecimalPlaces } from '@/utils/utils.ts'

const appStore = useAppStore()
const globalConfigStore = useGlobalConfigStore()

// --- 快捷跳转 ---
const quickSeekType = ref<'frame' | 'coord'>('frame')
const quickSeekValue = ref<number | undefined>(undefined)

const handleQuickSeek = () => {
  if (quickSeekValue.value === undefined || quickSeekValue.value === null || Number.isNaN(quickSeekValue.value)) return
  seekTo(quickSeekValue.value, quickSeekType.value)
}

// --- 延迟数据读取 ---
const delayFrames = computed<number>(() => {
  const val = appStore.currentSong?.xmlObject?.TITLE?.DELAY?.Value
  const parsed = parseFloat(String(val ?? '0'))
  return isNaN(parsed) ? 0 : parsed
})

// 延迟时间（秒）
const delaySeconds = computed(() => delayFrames.value / 60)

watch(delayFrames, () => {
  if (rawAudioBuffer.value) updateBufferWithDelay()
})

// --- 音频核心 ---
const audioRef = ref<HTMLAudioElement | null>(null)
const isLoaded = ref(false)
const isPlaying = ref(false)
const isDragging = ref(false)
const currentTime = ref(0)
const duration = ref(0)

// 速度控制底层变量
const playbackRate = ref(1.0) // 变速不变调 (Tempo)
const pitchRate = ref(1.0)    // 变速又变调 (Rate)
const rawAudioBuffer = ref<AudioBuffer | null>(null)

// --- 倍速安全过滤辅助函数 ---
const sanitizeRate = (val: unknown, fallback = 1.0): number => {
  if (val === undefined || val === null || typeof val !== 'number' || Number.isNaN(val)) {
    return fallback
  }
  return Math.min(Math.max(val, 0.1), 4.0)
}

// --- 1. 播放节拍 (Tempo) 安全计算属性 ---
const playbackRateSafe = computed<number>({
  get: () => playbackRate.value,
  set: (val: number | undefined) => {
    if (val !== undefined && val !== null && !Number.isNaN(val)) {
      playbackRate.value = sanitizeRate(val)
      applyPitchAndRateConfig()

      if (isPlaying.value && audioCtx) {
        startOffset = currentTime.value
        startTimestamp = audioCtx.currentTime
      }
    }
  },
})

// --- 2. 播放速率 (Rate) 安全计算属性 ---
const pitchRateSafe = computed<number>({
  get: () => pitchRate.value,
  set: (val: number | undefined) => {
    if (val !== undefined && val !== null && !Number.isNaN(val)) {
      pitchRate.value = sanitizeRate(val)
      applyPitchAndRateConfig()

      if (isPlaying.value && audioCtx) {
        startOffset = currentTime.value
        startTimestamp = audioCtx.currentTime
      }
    }
  },
})

// 复合有效播放速率
const combinedRate = computed(() => playbackRate.value * pitchRate.value)

// 音频元数据就绪标志
const isAudioReady = ref(false)

// Web Audio 对象与 Blob 管理
let audioCtx: AudioContext | null = null
let mediaElementSource: MediaElementAudioSourceNode | null = null
let gainNode: GainNode | null = null
let objectUrl: string | null = null
let animationFrameId: number | null = null

// 用于高精度时钟计算的变量
let startTimestamp = 0
let startOffset = 0

// ---------- 重置播放进度（统一处理） ----------
const resetPlayback = () => {
  pause()
  currentTime.value = 0
  if (audioRef.value) {
    audioRef.value.currentTime = 0
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

// ---------- 监听 BPM 列表变动，触发重置 ----------
watch(
  () => appStore.currentSong?.xmlObject?.TITLE?.BPM,
  () => {
    if (isLoaded.value && isAudioReady.value) {
      resetPlayback()
    }
  },
  { deep: true }
)

// Frame 显示（可负数）
const currentFrame = computed(() => {
  const raw = currentTime.value * 60 - delayFrames.value;
  return Number(raw.toFixed(getDecimalPlaces(globalConfigStore.stepCoord)));
});

// 1. 整理 BPM 列表：正确解析 0 和负数 BPM
const sortedBpmList = computed<Array<{ frame: number; bpm: number }>>(() => {
  const bpmData = appStore.currentSong?.xmlObject?.TITLE?.BPM as BpmItem[] | BpmItem | undefined
  if (!bpmData) return [{ frame: 0, bpm: 120 }]
  const list: BpmItem[] = Array.isArray(bpmData) ? bpmData : [bpmData]
  if (list.length === 0) return [{ frame: 0, bpm: 120 }]
  const sorted = list
    .map((item) => {
      const parsedBpm = parseFloat(String(item.BPM))
      return {
        frame: Number(item.Frame) || 0,
        // 🛡️ 修复：只有在解析为 NaN 时才使用 120 兜底，保留 0 和负数值
        bpm: Number.isNaN(parsedBpm) ? 120 : parsedBpm,
      }
    })
    .sort((a, b) => a.frame - b.frame)
  if (sorted[0].frame > 0) sorted.unshift({ frame: 0, bpm: sorted[0].bpm })
  return sorted
})

// 当前帧对应的 BPM 值（用于显示）
const bpmValue = computed<number>(() => {
  const list = sortedBpmList.value
  const tf = currentFrame.value
  if (tf < 0) return list[0]?.bpm ?? 120
  for (let i = list.length - 1; i >= 0; i--) {
    if (tf >= list[i].frame) return list[i].bpm
  }
  return list[0]?.bpm ?? 120
})

// 将 BPM 帧变化点转换为播放时间区间（秒）
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

// Coord 计算（正向计算：Time -> Coord）
const currentCoord = computed(() => {
  const t = currentTime.value
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

// 3. Coord 转 时间（逆向计算：Coord -> Time）：完整支持 0 和负数 BPM 区间检索
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

    // 如果到了最后一个 BPM 变化点（后面没有 next 时间点）
    if (!next) {
      if (rate === 0) return start
      const dt = (targetCoord - accumulatedCoord) / rate
      return Math.max(0, start + dt)
    }

    const segDuration = next.time - start
    const maxSegmentCoordChange = segDuration * rate
    const endCoord = accumulatedCoord + maxSegmentCoordChange

    // 分情况判断目标 Coord 是否落在当前时间段内
    if (rate > 0) {
      // 1. 正向增长 (BPM > 0)
      if (targetCoord >= accumulatedCoord && targetCoord <= endCoord) {
        return start + (targetCoord - accumulatedCoord) / rate
      }
    } else if (rate < 0) {
      // 2. 反向减少 (BPM < 0)
      if (targetCoord <= accumulatedCoord && targetCoord >= endCoord) {
        return start + (targetCoord - accumulatedCoord) / rate
      }
    } else {
      // 3. 保持静止 (BPM = 0)
      if (Math.abs(targetCoord - accumulatedCoord) < 1e-6) {
        return start
      }
    }

    accumulatedCoord = endCoord
  }

  return 0
}

// 时间编辑相关
const isEditingTime = ref(false)
const inputTimeString = ref('')

const vFocus = {
  mounted: (el: HTMLInputElement) => {
    el.focus()
    el.select()
  },
}

// 静音相关
const lastVolume = ref(1.0)

// --- 工具函数：将处理过的 AudioBuffer 转成 WAV Blob ---
const bufferToWaveBlob = (abuffer: AudioBuffer): Blob => {
  const numOfChan = abuffer.numberOfChannels
  const length = abuffer.length * numOfChan * 2 + 44
  const buffer = new ArrayBuffer(length)
  const view = new DataView(buffer)
  const channels: Float32Array[] = []
  let offset = 0
  let pos = 0

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true)
    pos += 2
  }
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true)
    pos += 4
  }

  setUint32(0x46464952) // "RIFF"
  setUint32(length - 8)
  setUint32(0x45564157) // "WAVE"
  setUint32(0x20746d66) // "fmt "
  setUint32(16)
  setUint16(1) // PCM
  setUint16(numOfChan)
  setUint32(abuffer.sampleRate)
  setUint32(abuffer.sampleRate * 2 * numOfChan)
  setUint16(numOfChan * 2)
  setUint16(16)
  setUint32(0x61746164) // "data"
  setUint32(length - pos - 4)

  for (let i = 0; i < abuffer.numberOfChannels; i++) {
    channels.push(abuffer.getChannelData(i))
  }

  while (offset < abuffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]))
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0
      view.setInt16(pos, sample, true)
      pos += 2
    }
    offset++
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

// --- 仅处理 Delay 填充的极速音频生成算法 ---
const updateBufferWithDelay = () => {
  if (!audioCtx || !rawAudioBuffer.value || !audioRef.value) return

  const raw = rawAudioBuffer.value
  const delay = delayFrames.value
  const sampleRate = raw.sampleRate

  // 1. 使用 store 中的 fixMusicDelay 进行响应式延迟修正
  const fixDelay = Number(globalConfigStore.fixMusicDelay) || 0
  const delaySec = delay / 60 - fixDelay

  const delaySamples = Math.round(delaySec * sampleRate)
  const totalSamples = Math.max(0, delaySamples + raw.length) // 防止负采样点

  const finalBuffer = audioCtx.createBuffer(raw.numberOfChannels, totalSamples, sampleRate)

  // 2. 数据填充（当 delaySamples 为负数时进行安全切片处理）
  const sourceOffset = delaySamples < 0 ? Math.abs(delaySamples) : 0
  const targetOffset = delaySamples > 0 ? delaySamples : 0
  const copyLength = raw.length - sourceOffset

  if (copyLength > 0) {
    for (let ch = 0; ch < raw.numberOfChannels; ch++) {
      const channelData = raw.getChannelData(ch).subarray(sourceOffset, sourceOffset + copyLength)
      finalBuffer.getChannelData(ch).set(channelData, targetOffset)
    }
  }

  // 3. 内存清理与重置
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }

  const blob = bufferToWaveBlob(finalBuffer)
  objectUrl = URL.createObjectURL(blob)

  isAudioReady.value = false

  if (audioRef.value) {
    const el = audioRef.value
    el.onloadedmetadata = null
    applyPitchAndRateConfig()
    el.src = objectUrl

    el.onloadedmetadata = () => {
      duration.value = el.duration
      isAudioReady.value = true
      if (!isFinite(duration.value) || duration.value <= 0) {
        duration.value = finalBuffer.duration
      }
    }
  }

  // 重置播放进度（停止播放并回归 0 秒）
  resetPlayback()
}

// --- 统一应用音频播放速率及变调属性配置 ---
const applyPitchAndRateConfig = () => {
  if (!audioRef.value) return
  const el = audioRef.value

  const isDefaultPitch = Math.abs(pitchRate.value - 1.0) < 0.001
  el.preservesPitch = isDefaultPitch
    ; (el as any).webkitPreservesPitch = isDefaultPitch


  // 🛡️ 限制 combinedRate 落在浏览器安全范围 [0.0625, 16.0] 内，防止抛出 RangeError 异常
  const safeCombinedRate = Math.min(Math.max(combinedRate.value, 0.0625), 16.0)
  el.playbackRate = safeCombinedRate
}

// --- 初始化音频 ---
const initAudio = async () => {
  const file = appStore.currentSong?.audioFile
  if (!file) {
    console.warn('未找到音频文件')
    return
  }

  try {
    if (mediaElementSource) {
      mediaElementSource.disconnect()
      mediaElementSource = null
    }
    if (audioCtx) {
      audioCtx.close().catch(() => { })
    }

    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    gainNode = audioCtx.createGain()
    gainNode.gain.value = globalConfigStore.musicVolume
    gainNode.connect(audioCtx.destination)

    if (audioRef.value && !mediaElementSource) {
      mediaElementSource = audioCtx.createMediaElementSource(audioRef.value)
      mediaElementSource.connect(gainNode)
    }

    const arrayBuffer = await file.arrayBuffer()
    const decoded = await audioCtx.decodeAudioData(arrayBuffer)
    rawAudioBuffer.value = decoded

    updateBufferWithDelay()

    if (audioRef.value) {
      audioRef.value.onended = () => {
        isPlaying.value = false
        currentTime.value = duration.value
        if (animationFrameId) cancelAnimationFrame(animationFrameId)
      }
    }

    isLoaded.value = true
  } catch (err) {
    console.error('音频初始化失败:', err)
    isLoaded.value = false
  }
}

// --- 播放控制 ---
const playAt = (offset: number) => {
  if (!audioRef.value || !audioCtx) return
  audioCtx.resume().catch((e) => console.warn('AudioContext 恢复失败', e))

  if (offset >= duration.value - 0.01) {
    offset = 0
  }

  audioRef.value.currentTime = offset
  applyPitchAndRateConfig()

  startTimestamp = audioCtx.currentTime
  startOffset = offset

  const playPromise = audioRef.value.play()
  if (playPromise !== undefined) {
    playPromise.catch((e) => {
      console.warn('播放被浏览器阻止:', e)
      isPlaying.value = false
    })
  }

  isPlaying.value = true
  updateProgress()
}

const pause = () => {
  if (audioRef.value) {
    audioRef.value.pause()
  }
  isPlaying.value = false
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
}

const togglePlay = () => {
  if (!isLoaded.value || !audioRef.value || !isAudioReady.value) return
  if (isPlaying.value) {
    pause()
  } else {
    const el = audioRef.value
    const isAtEnd = el.currentTime >= duration.value - 0.05
    const startPos = isAtEnd ? 0 : el.currentTime
    playAt(startPos)
  }
}

// --- 使用 @vueuse/core 监听全局空格键 ---
useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.code !== 'Space' || e.type !== 'keydown') return

    // 如果焦点在输入元素（如 input、textarea、contenteditable）上，忽略逻辑
    const activeElement = document.activeElement
    const isInputActive =
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).isContentEditable)

    if (isInputActive) return

    e.preventDefault() // 阻止默认的网页空格向下滚动行为
    togglePlay()
  },
})

// --- 进度更新 ---
const updateProgress = () => {
  if (!isPlaying.value || !audioCtx) return

  if (!isDragging.value) {
    const elapsed = (audioCtx.currentTime - startTimestamp) * combinedRate.value
    currentTime.value = Math.min(startOffset + elapsed, duration.value)
  }

  if (currentTime.value < duration.value) {
    animationFrameId = requestAnimationFrame(updateProgress)
  } else {
    isPlaying.value = false
    currentTime.value = duration.value
  }
}

// 监听 store 音量变化
watch(
  () => globalConfigStore.musicVolume,
  (val) => {
    if (gainNode) {
      gainNode.gain.value = val
    }
  },
  { immediate: true }
)
// 监听全局音轨修正延迟的变化，自动重新计算 Buffer 并从头播放
watch(
  () => globalConfigStore.fixMusicDelay,
  () => {
    if (rawAudioBuffer.value) {
      updateBufferWithDelay()
    }
  }
)

// --- 静音切换 ---
const toggleMute = () => {
  if (globalConfigStore.musicVolume === 0) {
    globalConfigStore.musicVolume = lastVolume.value || 1.0
  } else {
    lastVolume.value = globalConfigStore.musicVolume || 1.0
    globalConfigStore.musicVolume = 0
  }
}

// --- 进度条拖动 ---
const handleSliderInput = () => {
  isDragging.value = true
}

const handleSeek = (val: number) => {
  currentTime.value = val
  if (audioRef.value) {
    audioRef.value.currentTime = val
  }
  if (isPlaying.value && audioCtx) {
    startOffset = val
    startTimestamp = audioCtx.currentTime
  }
  isDragging.value = false
}

// --- 时间编辑 ---
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
  if (!isLoaded.value) return
  inputTimeString.value = formattedCurrentTime.value
  isEditingTime.value = true
}

// 手动输入跳转：UI 显示时间加上延迟后跳转到底层实际时间
const submitTimeChange = () => {
  if (!isEditingTime.value) return
  const inputDisplayTime = parseTimeToSeconds(inputTimeString.value)
  if (inputDisplayTime !== null) {
    const actualTime = inputDisplayTime + delaySeconds.value
    handleSeek(Math.max(0, Math.min(actualTime, duration.value)))
  }
  isEditingTime.value = false
}

const cancelTimeEdit = () => {
  isEditingTime.value = false
}

const formatTime = (s: number) => {
  if (!s || isNaN(s) || s < 0) return '00:00.000'
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  const ms = Math.floor((s % 1) * 1000).toString().padStart(3, '0')
  return `${m}:${sec}.${ms}`
}

// UI 文本只展示减去延迟后的时间，并保证不小于 0
const formattedDuration = computed(() => formatTime(Math.max(0, duration.value - delaySeconds.value)))
const formattedCurrentTime = computed(() => formatTime(Math.max(0, currentTime.value - delaySeconds.value)))

// --- 暴露给父组件的通用跳转接口 ---
const seekTo = (target: number | string, type: 'time' | 'frame' | 'coord') => {
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
    handleSeek(Math.max(0, Math.min(seconds, duration.value)))
  }
}

defineExpose({
  seekTo,
  currentTime,
  currentFrame,
  currentCoord,
  playbackRate,
  pitchRate,
  bpmValue,
  isPlaying,
  pause,
  duration,
})

// --- 生命周期 ---
onMounted(() => {
  initAudio()
})

onUnmounted(() => {
  pause()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  if (mediaElementSource) {
    mediaElementSource.disconnect()
    mediaElementSource = null
  }
  audioCtx?.close()
})
</script>