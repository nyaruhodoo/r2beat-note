import { defineStore } from 'pinia'

import { sanitizeFile } from '@/utils/utils'

// 定义当前音乐的数据接口
export interface SongData {
  // 数据库生成的ID
  id: number
  audioFile: File
  // 副音轨数组，多个附属音频轨道
  backingTracks: File[]
  xmlObject: SongXmlData
}

export interface NoteData {
  Coord: string
  Kind: string
  Level: string
  FxSndIndex: string
}

export interface BpmItem {
  Frame: string | number
  BPM: string | number
  OriginalBPM?: string | number
}

export interface SongXmlData {
  '?xml': {
    version: string
    encoding: string
  }
  TITLE: {
    Name: string
    BPM: BpmItem[]
    BGM: {
      Name: string
      Volume: string
    }
    DELAY: {
      Value: string
    }
    LENGTH: {
      Value: string
    }
    AREA: NoteData[]
  }
}

interface AppState {
  currentSong: SongData | null
  selectedObstacle: NoteData | null
  selectedCoords: Set<number>
}

export const useAppStore = defineStore('store', {
  state: (): AppState => {
    return {
      // 当前正在播放/编辑的音乐数据
      currentSong: null,

      // 当前选中的障碍物
      selectedObstacle: null,

      selectedCoords: new Set(),
    }
  },

  actions: {
    // 设置当前音乐：在这里直接完成 File 对象的脱敏
    setCurrentSong(song: SongData) {
      this.currentSong = {
        ...song,
        // 1. 标记音频文件本身为 raw（非响应式），防止 Proxy 包装 File
        audioFile: sanitizeFile(song.audioFile),

        // 2. 数组保留响应式！仅对里面的每个 File 节点进行 markRaw
        backingTracks: song.backingTracks
          ? song.backingTracks.map((file) => sanitizeFile(file))
          : [],

        // 3. xmlObject 保持正常响应式，方便编辑器实时修改谱面
        xmlObject: song.xmlObject,
      }
    },
    // 重置音乐数据
    resetCurrentSong() {
      this.currentSong = null
    },
    // 追加副音轨（数组依然响应式，新增的 File 也会自动脱敏）
    addBackingTrack(file: File) {
      if (this.currentSong) {
        this.currentSong.backingTracks.push(sanitizeFile(file))
      }
    },
  },
})
