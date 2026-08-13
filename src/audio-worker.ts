export interface TrackData {
  channels: Float32Array[]
  length: number
  sampleRate: number
}

export interface WorkerPayload {
  taskId: number
  tracks: TrackData[]
  targetSampleRate: number
  delayFrames: number
  fixMusicDelay: number
}

self.onmessage = (e: MessageEvent<WorkerPayload>) => {
  const { taskId, tracks, targetSampleRate, delayFrames, fixMusicDelay } = e.data

  if (!tracks || tracks.length === 0) {
    self.postMessage({ taskId, error: 'No tracks provided' })
    return
  }

  // 1. 计算延迟 offset
  const delaySec = delayFrames / 60 - fixMusicDelay
  const delaySamples = Math.round(delaySec * targetSampleRate)

  // 2. 计算最长采样点
  let maxRawLength = 0
  tracks.forEach((track) => {
    const trackDuration = track.length / track.sampleRate
    const trackSamplesInTarget = Math.round(trackDuration * targetSampleRate)
    if (trackSamplesInTarget > maxRawLength) {
      maxRawLength = trackSamplesInTarget
    }
  })

  const totalSamples = Math.max(1, delaySamples + maxRawLength)
  const totalTracks = tracks.length
  const mergedChannels: Float32Array[] = []

  const sourceOffset = delaySamples < 0 ? Math.abs(delaySamples) : 0
  const targetOffset = delaySamples > 0 ? delaySamples : 0

  // 3. 多通道对齐与重采样 (后台线程处理)
  tracks.forEach((track) => {
    const targetChannel = new Float32Array(totalSamples)
    const trackSamples = Math.round((track.length / track.sampleRate) * targetSampleRate)
    const copyLength = Math.max(0, trackSamples - sourceOffset)

    const ch0 = track.channels[0]
    const ch1 = track.channels.length > 1 ? track.channels[1] : null
    const ratio = track.sampleRate / targetSampleRate

    for (let i = 0; i < copyLength; i++) {
      const srcIdx = Math.floor((i + sourceOffset) * ratio)
      if (srcIdx < track.length) {
        let sample = ch0[srcIdx]
        if (ch1) {
          sample = (sample + ch1[srcIdx]) * 0.5
        }
        if (targetOffset + i < totalSamples) {
          targetChannel[targetOffset + i] = sample
        }
      }
    }
    mergedChannels.push(targetChannel)
  })

  // 4. 构建 16-bit PCM WAV ArrayBuffer (后台线程处理)
  const numOfChan = totalTracks
  const pcmByteLength = totalSamples * numOfChan * 2
  const headerByteLength = 44
  const wavBuffer = new ArrayBuffer(headerByteLength + pcmByteLength)
  const view = new DataView(wavBuffer)

  let pos = 0
  const setUint16 = (val: number) => {
    view.setUint16(pos, val, true)
    pos += 2
  }
  const setUint32 = (val: number) => {
    view.setUint32(pos, val, true)
    pos += 4
  }

  setUint32(0x46464952) // "RIFF"
  setUint32(headerByteLength + pcmByteLength - 8)
  setUint32(0x45564157) // "WAVE"
  setUint32(0x20746d66) // "fmt "
  setUint32(16)
  setUint16(1) // PCM
  setUint16(numOfChan)
  setUint32(targetSampleRate)
  setUint32(targetSampleRate * 2 * numOfChan)
  setUint16(numOfChan * 2)
  setUint16(16)
  setUint32(0x61746164) // "data"
  setUint32(pcmByteLength)

  let offset = 0
  while (offset < totalSamples) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, mergedChannels[i][offset]))
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0
      view.setInt16(pos, sample, true)
      pos += 2
    }
    offset++
  }

  const duration = totalSamples / targetSampleRate

  // 将结果打包，以零拷贝形式传递回主线程
  // @ts-expect-error  什么玩意的类型错误。。懒得管
  self.postMessage({ taskId, wavBuffer, duration }, [wavBuffer])
}
