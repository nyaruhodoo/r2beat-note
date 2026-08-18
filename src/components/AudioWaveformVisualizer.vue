<template>
  <div class="rhythm-waveform-container">
    <div class="top-bar">
      <!-- 音轨选择器 -->
      <div class="track-selector" v-if="trackOptions.length > 0">
        <label class="label">分析音轨：</label>
        <select v-model="selectedTrack" @change="handleTrackChange" class="select-input">
          <option v-for="opt in trackOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- 图例 -->
      <div class="legend-bar">
        <span class="tag high">🔵 高频 (Hi-Hat/擦片)</span>
        <span class="tag mid">🟢 中频 (人声/军鼓)</span>
        <span class="tag low">🔴 低频 (Kick/重鼓)</span>
      </div>
    </div>

    <!-- 波形容器 -->
    <div class="waveform-wrapper">
      <div ref="containerRef" class="waveform-core"></div>

      <div v-if="isProcessing" class="loading-overlay">
        <div class="spinner"></div>
        <span>正在解析【音轨 {{ selectedTrack + 1 }}】的波形数据...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import type { WaveSurferOptions } from 'wavesurfer.js'

import { useAppStore } from '@/store/store'

const props = withDefaults(
  defineProps<{
    seekTo?: (target: number | string, type: 'time' | 'frame' | 'coord') => void
    options?: Partial<WaveSurferOptions>
  }>(),
  {
    options: () => ({}),
  },
)

const appStore = useAppStore()
const containerRef = ref<HTMLDivElement | null>(null)
const isProcessing = ref<boolean>(false)

const selectedTrack = ref<number>(0)
const trackOptions = ref<{ label: string; value: number }[]>([])

let wavesurfer: WaveSurfer | null = null

let cachedAudioBuffer: AudioBuffer | null = null
let cachedAudioUrl: string | null = null

const getAudioBuffer = async (audioUrl: string): Promise<AudioBuffer> => {
  if (cachedAudioBuffer && cachedAudioUrl === audioUrl) {
    return cachedAudioBuffer
  }

  const response = await fetch(audioUrl)
  const arrayBuffer = await response.arrayBuffer()
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const audioCtx = new AudioCtx()
  const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  audioCtx.close()

  cachedAudioBuffer = decodedBuffer
  cachedAudioUrl = audioUrl
  return decodedBuffer
}

const extractMultibandPeaks = async (
  audioUrl: string,
  targetChannel = 0,
  samplesPerSec = 80,
): Promise<{ peaks: number[][]; totalChannels: number }> => {
  const decodedBuffer = await getAudioBuffer(audioUrl)
  const totalChannels = decodedBuffer.numberOfChannels
  const activeChannel = Math.min(Math.max(0, targetChannel), totalChannels - 1)
  const totalSamples = Math.floor(decodedBuffer.duration * samplesPerSec)

  const filterAndGetPeaks = async (
    filterType: BiquadFilterType,
    freq: number,
    q = 1,
  ): Promise<number[]> => {
    const offlineCtx = new OfflineAudioContext(
      decodedBuffer.numberOfChannels,
      decodedBuffer.length,
      decodedBuffer.sampleRate,
    )

    const source = offlineCtx.createBufferSource()
    source.buffer = decodedBuffer

    const filter = offlineCtx.createBiquadFilter()
    filter.type = filterType
    filter.frequency.value = freq
    filter.Q.value = q

    source.connect(filter)
    filter.connect(offlineCtx.destination)
    source.start(0)

    const renderedBuffer = await offlineCtx.startRendering()
    const channelData = renderedBuffer.getChannelData(activeChannel)

    const step = Math.floor(channelData.length / totalSamples)
    const peaks = new Float32Array(totalSamples)

    for (let i = 0; i < totalSamples; i++) {
      let max = 0
      const start = i * step
      const end = Math.min(start + step, channelData.length)
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j])
        if (abs > max) max = abs
      }
      peaks[i] = max
    }
    return Array.from(peaks)
  }

  const [lowPeaks, midPeaks, highPeaks] = await Promise.all([
    filterAndGetPeaks('lowpass', 200),
    filterAndGetPeaks('bandpass', 1200, 0.8),
    filterAndGetPeaks('highpass', 4000),
  ])

  return {
    peaks: [highPeaks, midPeaks, lowPeaks],
    totalChannels,
  }
}

const initWaveSurfer = async () => {
  if (!containerRef.value || !appStore.currentSongInfo.musicObjectUrl) return

  if (wavesurfer) {
    wavesurfer.destroy()
    wavesurfer = null
  }

  isProcessing.value = true

  try {
    const { peaks, totalChannels } = await extractMultibandPeaks(
      appStore.currentSongInfo.musicObjectUrl,
      selectedTrack.value,
    )

    if (trackOptions.value.length !== totalChannels) {
      trackOptions.value = Array.from({ length: totalChannels }, (_, i) => ({
        label: `音轨 ${i + 1} (${i === 0 ? 'L / 主声轨' : i === 1 ? 'R / 辅声轨' : `Track ${i + 1}`})`,
        value: i,
      }))
    }

    const defaultOptions: WaveSurferOptions = {
      container: containerRef.value,
      height: 150,
      fillParent: true,
      autoCenter: false,
      autoScroll: false,
      cursorColor: '#FFD700',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      interact: true,
      splitChannels: [
        { waveColor: '#3182CE', progressColor: '#63B3ED' },
        { waveColor: '#38A169', progressColor: '#68D391' },
        { waveColor: '#E53E3E', progressColor: '#FC8181' },
      ],
    }

    wavesurfer = WaveSurfer.create({
      ...defaultOptions,
      ...props.options,
    })
    wavesurfer.load(appStore.currentSongInfo.musicObjectUrl, peaks)

    wavesurfer.on('interaction', (newTime: number) => {
      if (props.seekTo) {
        props.seekTo(newTime, 'time')
      }
    })

    wavesurfer.on('ready', () => {
      isProcessing.value = false
      if (appStore.currentSongInfo.currentTime > 0) {
        wavesurfer?.setTime(appStore.currentSongInfo.currentTime)
      }
    })
  } catch (err) {
    console.error('音频分析失败:', err)
    isProcessing.value = false
  }
}

const handleTrackChange = () => {
  initWaveSurfer()
}

watch(
  () => appStore.currentSongInfo.musicObjectUrl,
  (newUrl) => {
    if (newUrl) {
      cachedAudioBuffer = null
      cachedAudioUrl = null
      selectedTrack.value = 0
      initWaveSurfer()
    }
  },
  { immediate: true },
)

watch(
  () => appStore.currentSongInfo.currentTime,
  (newTime) => {
    if (!wavesurfer || isProcessing.value) return
    const wsTime = wavesurfer.getCurrentTime()
    if (Math.abs(wsTime - newTime) > 0.01) {
      wavesurfer.setTime(newTime)
    }
  },
)

onMounted(() => {
  nextTick(() => {
    if (containerRef.value && !wavesurfer && appStore.currentSongInfo.musicObjectUrl) {
      initWaveSurfer()
    }
  })
})

onUnmounted(() => {
  if (wavesurfer) {
    wavesurfer.destroy()
    wavesurfer = null
  }
  cachedAudioBuffer = null
  cachedAudioUrl = null
})
</script>

<style scoped>
.rhythm-waveform-container {
  width: 100%;
  background-color: #111827;
  border-radius: 6px;
  padding: 8px;
  box-sizing: border-box;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}

.track-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e2e8f0;
}

.select-input {
  background-color: #1f2937;
  color: #38bdf8;
  border: 1px solid #374151;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.select-input:hover {
  border-color: #4b5563;
}

.legend-bar {
  display: flex;
  gap: 12px;
}

.legend-bar .tag.high {
  color: #63b3ed;
}

.legend-bar .tag.mid {
  color: #68d391;
}

.legend-bar .tag.low {
  color: #fc8181;
}

.waveform-wrapper {
  position: relative;
  width: 100%;
  max-width: 100%;
  background-color: #1a202c;
  border-radius: 4px;
  overflow: hidden;
  box-sizing: border-box;
}

.waveform-core {
  width: 100%;
  max-width: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #38bdf8;
  font-size: 13px;
  gap: 8px;
  z-index: 10;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #38bdf8;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
