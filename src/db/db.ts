import Dexie, { type Table } from 'dexie'

import type { SongData } from '@/store/store'

// 存入前、新增时的数据：没有id
export type SongCreate = Omit<SongData, 'id'>

// 数据库读取后的完整记录：自动生成id
export interface SongRecord extends SongData {
  id: number
}

class MusicDatabase extends Dexie {
  // Table<完整记录类型, 主键类型, 新增省略主键的类型>
  songs!: Table<SongRecord, number, SongCreate>

  constructor() {
    super('MusicAppDatabase')
    this.version(1).stores({
      songs: '++id', // 自增主键
    })
  }
}

export const db = new MusicDatabase()
