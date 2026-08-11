import { defineStore } from 'pinia'

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
    version: '1.0'
    encoding: 'euc-kr'
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
}

export const useAppStore = defineStore('store', {
  state: (): AppState => {
    return {
      // 当前正在播放/编辑的音乐数据
      currentSong: null,

      // 当前选中的障碍物
      selectedObstacle: null,
    }
  },

  actions: {
    // 设置当前音乐
    setCurrentSong(song: SongData) {
      this.currentSong = song
    },

    // 重置音乐数据
    resetCurrentSong() {
      this.currentSong = null
    },
  },
})
