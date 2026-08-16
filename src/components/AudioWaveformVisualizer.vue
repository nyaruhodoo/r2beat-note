  <template>
    <div class="flex w-full flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm select-none">
      <!-- 1. 顶部控制栏 -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="flex items-center gap-2">
          <span class="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" v-if="isLoading"></span>
          <span class="text-sm font-semibold text-slate-700">音频频谱分析器</span>
          <span v-if="isLoading" class="text-xs text-indigo-500 font-medium animate-pulse">
            {{ loadingText }}
          </span>
        </div>

        <!-- 配置面板切换按钮 -->
        <button @click="showConfig = !showConfig"
          class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
          <svg class="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          频谱参数配置
        </button>
      </div>

      <!-- 2. 波形 + 频谱图 统一精准点击区域 -->
      <div ref="containerRef"
        class="relative w-full cursor-crosshair overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-inner select-none"
        @mousemove="handleMouseMove" @mouseleave="handleMouseLeave" @click="handleContainerClick">

        <!-- Wavesurfer 波形挂载目标 -->
        <div ref="waveformRef" class="w-full"></div>

        <!-- Wavesurfer 频谱图插件挂载目标 -->
        <div ref="spectrogramRef" class="relative w-full border-t border-slate-800/80 transition-all"
          :style="{ height: `${config.spectrogramHeight}px` }"></div>

        <!-- 悬停指示线 & 时间 Tooltip -->
        <template v-if="hoverRatio !== null && activeDuration">
          <div
            class="pointer-events-none absolute top-0 bottom-0 w-px bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] z-20"
            :style="{ left: `${hoverRatio * 100}%` }"></div>

          <div
            class="pointer-events-none absolute top-2 z-30 -translate-x-1/2 rounded bg-slate-900/90 px-2 py-0.5 font-mono text-[11px] font-medium text-cyan-300 shadow-md border border-cyan-500/30 backdrop-blur-sm"
            :style="{ left: `${getTooltipLeft(hoverRatio)}%` }">
            {{ formatTime(hoverRatio * activeDuration) }}
          </div>
        </template>
      </div>

      <!-- 3. 参数配置面板 -->
      <div v-if="showConfig"
        class="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 text-xs border border-slate-200/80 transition-all mt-2">
        <div class="font-semibold text-slate-700 text-xs border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-indigo-600"></span>
          频谱分析控制 (FFT)
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <!-- FFT Samples (改动需要重新载入音频计算) -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between font-medium text-slate-600">
              <span>FFT 采样率 (Size)</span>
              <span class="font-mono text-indigo-600 font-semibold">{{ config.fftSamples }}</span>
            </div>
            <select v-model.number="config.fftSamples"
              class="rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option :value="256">256 (低分辨率)</option>
              <option :value="512">512 (标准推荐)</option>
              <option :value="1024">1024 (高分辨率)</option>
              <option :value="2048">2048 (极高分辨率/较慢)</option>
            </select>
          </div>

          <!-- 窗函数 -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between font-medium text-slate-600">
              <span>窗函数 (Window)</span>
              <span class="font-mono text-indigo-600 font-semibold">{{ config.windowFunc }}</span>
            </div>
            <select v-model="config.windowFunc"
              class="rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="hann">Hann (平滑推荐)</option>
              <option value="hamming">Hamming</option>
              <option value="blackman">Blackman</option>
            </select>
          </div>

          <!-- 频谱图高度 (纯UI调整，无需重载) -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between font-medium text-slate-600">
              <span>频谱高度</span>
              <span class="font-mono text-indigo-600 font-semibold">{{ config.spectrogramHeight }}px</span>
            </div>
            <input type="range" min="80" max="260" step="10" v-model.number="config.spectrogramHeight"
              class="h-1.5 w-full cursor-pointer rounded-lg bg-slate-200 accent-indigo-600" />
          </div>

          <!-- 显示最高频率 -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between font-medium text-slate-600">
              <span>最高显示频率</span>
              <span class="font-mono text-indigo-600 font-semibold">{{ config.frequencyMax }} Hz</span>
            </div>
            <input type="range" min="4000" max="22050" step="500" v-model.number="config.frequencyMax"
              class="h-1.5 w-full cursor-pointer rounded-lg bg-slate-200 accent-indigo-600" />
          </div>

          <!-- 显示最低频率 -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between font-medium text-slate-600">
              <span>最低显示频率</span>
              <span class="font-mono text-indigo-600 font-semibold">{{ config.frequencyMin }} Hz</span>
            </div>
            <input type="range" min="0" max="1000" step="20" v-model.number="config.frequencyMin"
              class="h-1.5 w-full cursor-pointer rounded-lg bg-slate-200 accent-indigo-600" />
          </div>
        </div>
      </div>
    </div>
  </template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onUnmounted, nextTick } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram.js'

const props = defineProps<{
  musicObjectUrl?: string
  currentTime?: number
  duration?: number
  seekTo?: (target: number | string, type: 'time' | 'frame' | 'coord') => void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const waveformRef = ref<HTMLDivElement | null>(null)
const spectrogramRef = ref<HTMLDivElement | null>(null)

const isLoading = ref(false)
const loadingText = ref('加载中...')
const showConfig = ref(false)
const hoverRatio = ref<number | null>(null)
const internalDuration = ref(0)

let wavesurfer: WaveSurfer | null = null
let spectrogramPlugin: any = null

// 默认采用官方建议的 512 作为平衡点
const config = reactive({
  fftSamples: 512,
  windowFunc: 'hann' as "hann" | "hamming" | "blackman" | "rectangular",
  spectrogramHeight: 140,
  frequencyMin: 0,
  frequencyMax: 16000,
})

const activeDuration = computed(() => props.duration || internalDuration.value)

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00.00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

function getTooltipLeft(ratio: number): number {
  return Math.max(0.05, Math.min(0.95, ratio)) * 100
}

async function initWaveSurfer() {
  if (!waveformRef.value || !spectrogramRef.value || !props.musicObjectUrl) {
    destroyWaveSurfer()
    return
  }

  destroyWaveSurfer()
  isLoading.value = true
  loadingText.value = '解析音频与频谱数据...'

  try {
    spectrogramPlugin = Spectrogram.create({
      container: spectrogramRef.value,
      fftSamples: config.fftSamples,
      windowFunc: config.windowFunc,
      height: config.spectrogramHeight,
      frequencyMin: config.frequencyMin,
      frequencyMax: config.frequencyMax,
      labels: true,
    })

    wavesurfer = WaveSurfer.create({
      container: waveformRef.value,
      waveColor: '#00f3ff',
      progressColor: '#f43f5e',
      cursorColor: '#ffffff',
      cursorWidth: 2,
      height: 50,
      interact: false,
      url: props.musicObjectUrl,
      plugins: [spectrogramPlugin],
    })

    wavesurfer.on('loading', (percent: number) => {
      isLoading.value = true
      loadingText.value = `解析音频数据 ${percent}%...`
    })

    wavesurfer.on('ready', () => {
      isLoading.value = false
      internalDuration.value = wavesurfer?.getDuration() || 0
      if (props.currentTime !== undefined) {
        wavesurfer?.setTime(props.currentTime)
      }
    })
  } catch (err) {
    console.warn('音频或频谱插件加载失败:', err)
    isLoading.value = false
  }
}

function destroyWaveSurfer() {
  if (wavesurfer) {
    wavesurfer.destroy()
    wavesurfer = null
    spectrogramPlugin = null
  }
}

function handleContainerClick(e: MouseEvent) {
  if (!containerRef.value || !activeDuration.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  const ratio = clickX / rect.width
  const targetTime = ratio * activeDuration.value

  wavesurfer?.setTime(targetTime)

  if (props.seekTo) {
    props.seekTo(targetTime, 'time')
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  hoverRatio.value = x / rect.width
}

function handleMouseLeave() {
  hoverRatio.value = null
}

// 同步外部播放进度
watch(
  () => props.currentTime,
  (newTime) => {
    if (wavesurfer && newTime !== undefined && !isLoading.value) {
      const wsTime = wavesurfer.getCurrentTime()
      if (Math.abs(wsTime - newTime) > 0.05) {
        wavesurfer.setTime(newTime)
      }
    }
  }
)

// 监听音频链接变化：重新完整初始化
watch(
  () => props.musicObjectUrl,
  () => {
    nextTick(() => initWaveSurfer())
  },
  { immediate: true }
)

// 1. 【性能优化】只有改变底层核心计算参数（fftSamples 或 windowFunc）时，才重新构建整个实例
watch(
  [() => config.fftSamples, () => config.windowFunc],
  () => {
    initWaveSurfer()
  }
)

// 2. 【性能优化】对于拖拽高频触发的范围和高度调整，增加防抖，直接让实例销毁重建或局部应用（此处采用防抖重新载入，避免拖动时连续卡顿）
let debounceTimer: number | null = null
watch(
  [() => config.spectrogramHeight, () => config.frequencyMin, () => config.frequencyMax],
  () => {
    if (debounceTimer) window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => {
      initWaveSurfer()
    }, 300) // 300ms 防抖，完美保障滑动跟手且不卡死
  }
)

onUnmounted(() => {
  if (debounceTimer) window.clearTimeout(debounceTimer)
  destroyWaveSurfer()
})
</script>