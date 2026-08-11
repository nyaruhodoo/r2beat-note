import { liveQuery, type Subscription } from 'dexie'
import { ref, onUnmounted } from 'vue'

import type { SongData } from '@/store/store'

import { db, type SongRecord } from './db'

export function useSongStorage() {
  const songs = ref<SongRecord[]>([])
  const loading = ref<boolean>(true)
  const error = ref<Error | null>(null)

  // 1. 实时监听数据库全量变化（Dexie liveQuery 机制）
  const subscription: Subscription = liveQuery(() => db.songs.toArray()).subscribe({
    next: (data) => {
      songs.value = data
      loading.value = false
    },
    error: (err) => {
      error.value = err
      loading.value = false
    },
  })

  // 组件卸载时自动取消订阅，防止内存泄漏
  onUnmounted(() => {
    subscription.unsubscribe()
  })

  // 2. 增加歌曲 (Create)
  const addSong = async (song: Omit<SongData, 'id'>): Promise<number> => {
    try {
      // IndexedDB 可以直接存储 File 对象和嵌套 JSON
      const id = await db.songs.add(song)
      return id as number
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // 3. 根据 ID 查询单条记录 (Read)
  const getSongById = async (id: number): Promise<SongRecord | undefined> => {
    try {
      return await db.songs.get(id)
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // 4. 更新歌曲 (Update)
  const updateSong = async (id: number, changes: Partial<SongRecord>): Promise<number> => {
    try {
      return await db.songs.update(id, changes)
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // 5. 删除歌曲 (Delete)
  const deleteSong = async (id: number): Promise<void> => {
    try {
      await db.songs.delete(id)
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  // 6. 清空整个歌曲表
  const clearAllSongs = async (): Promise<void> => {
    try {
      await db.songs.clear()
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  return {
    songs, // 响应式的歌曲列表，数据库有变动时会自动更新
    loading, // 加载状态
    error, // 错误信息
    addSong,
    getSongById,
    updateSong,
    deleteSong,
    clearAllSongs,
  }
}
