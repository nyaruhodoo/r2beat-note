<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
    <!-- 头部欢迎区域 -->
    <div class="mb-10 max-w-xl space-y-3 text-center">
      <div
        class="mb-2 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
        <el-icon :size="36">
          <Headset />
        </el-icon>
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-slate-800">音乐工作台</h1>
    </div>

    <!-- 核心操作卡片区域 -->
    <div class="grid w-full max-w-2xl grid-cols-1 gap-6 md:grid-cols-2">
      <!-- 1. 新建歌曲 -->
      <router-link to="/new-music"
        class="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:border-emerald-500/50 hover:shadow-xl">
        <div
          class="absolute -right-4 -bottom-4 z-0 h-24 w-24 rounded-full bg-emerald-50 transition-transform duration-500 ease-out group-hover:scale-150">
        </div>

        <div class="relative z-10 space-y-4">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition-transform group-hover:scale-110">
            <el-icon :size="24">
              <Plus />
            </el-icon>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-slate-800 transition-colors group-hover:text-emerald-600">
              新建歌曲
            </h2>
            <p class="mt-1 text-xs text-slate-500">开始创作全新作品</p>
          </div>
        </div>
      </router-link>

      <!-- 2. 导入歌曲 -->
      <router-link to="/import-music"
        class="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:border-blue-500/50 hover:shadow-xl">
        <div
          class="absolute -right-4 -bottom-4 z-0 h-24 w-24 rounded-full bg-blue-50 transition-transform duration-500 ease-out group-hover:scale-150">
        </div>

        <div class="relative z-10 space-y-4">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-transform group-hover:scale-110">
            <el-icon :size="24">
              <Upload />
            </el-icon>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-slate-800 transition-colors group-hover:text-blue-600">
              导入歌曲
            </h2>
            <p class="mt-1 text-xs text-slate-500">读取已有 XML 文件</p>
          </div>
        </div>
      </router-link>
    </div>

    <!-- 3. 已有歌曲列表区域 (有数据时才显示) -->
    <div v-if="songs.length > 0" class="mt-8 w-full max-w-2xl space-y-3">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center space-x-2">
          <h2 class="text-sm font-semibold tracking-wide text-slate-700">已有项目</h2>
          <span class="rounded-full bg-slate-200/60 px-2 py-0.5 text-xs font-medium text-slate-600">
            {{ songs.length }}
          </span>
        </div>
        <span v-if="loading" class="flex items-center text-xs text-slate-400">
          <span class="mr-1.5 h-2 w-2 animate-ping rounded-full bg-emerald-400"></span>
          同步数据库中...
        </span>
      </div>

      <!-- 滚动容器：限定最大高度，平滑滚动，隐藏粗糙默认滚动条 -->
      <div
        class="max-h-80 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent space-y-2.5 overflow-y-auto pr-1.5 hover:scrollbar-thumb-slate-300">
        <div v-for="song in songs" :key="song.id"
          class="group flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/80 p-3.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-emerald-300 hover:bg-white hover:shadow-md">
          <!-- 歌曲信息摘要 -->
          <div class="flex items-center space-x-3.5 overflow-hidden">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100/80 text-slate-500 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-600">
              <el-icon :size="20">
                <FolderOpened />
              </el-icon>
            </div>
            <div class="min-w-0 space-y-0.5">
              <h3 class="truncate text-sm font-medium text-slate-800 transition-colors group-hover:text-emerald-700">
                {{ song.xmlObject?.TITLE?.Name || '未命名歌曲' }}
              </h3>
              <p class="flex items-center space-x-2 text-xs text-slate-400">
                <span>{{ song.audioFile?.name || '无音频源' }}</span>
                <span v-if="song.backingTracks?.length"
                  class="py-0.2 inline-flex items-center rounded bg-slate-100 px-1.5 text-[10px] text-slate-500">
                  +{{ song.backingTracks.length }} 轨
                </span>
              </p>
            </div>
          </div>

          <!-- 操作按钮组 -->
          <div class="flex items-center space-x-1 pl-3">
            <el-button type="primary" link size="small" class="font-medium transition-transform active:scale-95"
              @click="handleEdit(song.id!)">
              打开
            </el-button>
            <span class="text-slate-200">|</span>
            <el-button type="danger" link size="small"
              class="font-medium text-slate-400 transition-colors hover:text-rose-500" @click="handleDelete(song.id!)">
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Headset, Plus, Upload, FolderOpened } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

import { useSongStorage } from '@/db/useSongStorage'
import { useAppStore } from '@/store/store'

const { setCurrentSong } = useAppStore()

const router = useRouter()
const { songs, loading, deleteSong } = useSongStorage()

// 打开/编辑已有歌曲
const handleEdit = (id: number) => {
  const targetSong = songs.value.find((s) => s.id === id)
  if (targetSong) {
    setCurrentSong(targetSong)
    router.push('/note-editor')
  } else {
    ElMessage.error('找不到对应歌曲数据')
  }
}

// 删除歌曲
const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这首歌曲吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await deleteSong(id)
    ElMessage.success('删除成功')
  } catch {
    // 捕获用户点击取消的操作，防止控制台打印 Uncaught Exception
  }
}
</script>
