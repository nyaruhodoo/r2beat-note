<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
    <div class="w-full max-w-2xl space-y-8">
      <!-- 核心操作卡片区域（新建 & 导入） -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <!-- 1. 新建歌曲 -->
        <router-link to="/new-music"
          class="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl bg-white p-7 shadow-lg shadow-slate-950/5 ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:ring-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10">
          <div
            class="absolute -right-6 -bottom-6 z-0 h-32 w-32 rounded-full bg-emerald-50/60 transition-transform duration-500 ease-out group-hover:scale-125">
          </div>

          <div class="relative z-10 space-y-5">
            <div
              class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-transform duration-300 group-hover:scale-105">
              <el-icon :size="28">
                <Plus />
              </el-icon>
            </div>
            <div>
              <h2
                class="text-xl font-bold tracking-tight text-slate-800 transition-colors group-hover:text-emerald-600">
                新建歌曲
              </h2>
              <p class="mt-1 text-sm font-medium text-slate-400">开始创作全新的音乐项目</p>
            </div>
          </div>
        </router-link>

        <!-- 2. 导入歌曲 -->
        <router-link to="/import-music"
          class="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl bg-white p-7 shadow-lg shadow-slate-950/5 ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:ring-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10">
          <div
            class="absolute -right-6 -bottom-6 z-0 h-32 w-32 rounded-full bg-blue-50/60 transition-transform duration-500 ease-out group-hover:scale-125">
          </div>

          <div class="relative z-10 space-y-5">
            <div
              class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-transform duration-300 group-hover:scale-105">
              <el-icon :size="28">
                <Upload />
              </el-icon>
            </div>
            <div>
              <h2 class="text-xl font-bold tracking-tight text-slate-800 transition-colors group-hover:text-blue-600">
                导入歌曲
              </h2>
              <p class="mt-1 text-sm font-medium text-slate-400">解析并读取已有 XML 谱面</p>
            </div>
          </div>
        </router-link>
      </div>

      <!-- 3. 已有歌曲列表区域 (有数据时才显示) -->
      <div class="space-y-2">
        <!-- 标题栏 -->
        <div class="flex items-center justify-between px-2 pb-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">最近项目</span>
            <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {{ songs.length }}
            </span>
          </div>
        </div>

        <div class="custom-scrollbar h-90 divide-y divide-slate-100 overflow-y-auto pr-1">
          <div v-for="song in songs" :key="song.id"
            class="group flex items-center justify-between rounded-xl p-3 transition-colors duration-150 hover:bg-slate-100/70">

            <!-- 歌曲信息 -->
            <div class="flex items-center gap-3.5 min-w-0">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-emerald-100/70 group-hover:text-emerald-700">
                <el-icon :size="18">
                  <FolderOpened />
                </el-icon>
              </div>

              <div class="min-w-0 space-y-0.5">
                <h3
                  class="truncate text-sm font-semibold text-slate-800 transition-colors group-hover:text-emerald-800">
                  {{ song.xmlObject?.TITLE?.Name || '未命名歌曲' }}
                </h3>
                <div class="flex items-center gap-2 text-xs text-slate-400">
                  <span class="truncate max-w-50">{{ song.audioFile?.name || '无音频源' }}</span>
                  <span v-if="song.backingTracks?.length" class="text-slate-300">•</span>
                  <span v-if="song.backingTracks?.length" class="text-slate-400">
                    +{{ song.backingTracks.length }} 轨
                  </span>
                </div>
              </div>
            </div>

            <!-- 操作区 -->
            <div class="flex items-center gap-1 shrink-0">
              <el-button type="primary" link
                class="text-xs font-semibold !ext-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                @click="handleEdit(song.id)">
                打开
              </el-button>

              <el-popconfirm title="确定删除此歌曲？" confirm-button-text="删除" cancel-button-text="取消"
                confirm-button-type="danger" width="180" @confirm="handleDelete(song.id)">
                <template #reference>
                  <el-button type="danger" link
                    class="text-xs font-normal text-slate-400 hover:text-rose-600 px-2 py-1.5 rounded-lg hover:bg-rose-50 transition-colors">
                    <el-icon :size="15">
                      <Delete />
                    </el-icon>
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Upload, FolderOpened, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

import { useSongStorage } from '@/db/useSongStorage'


const router = useRouter()
const { songs, deleteSong } = useSongStorage()

// 打开/编辑已有歌曲
const handleEdit = (id: number) => {
  router.push(`/note-editor/${id}`)
}

// 执行真正的删除逻辑
const handleDelete = async (id: number) => {
  try {
    await deleteSong(id)
    ElMessage.success('删除成功')
  } catch (err) {
    console.error('删除歌曲失败:', err)
    ElMessage.error('删除失败，请重试')
  }
}
</script>

<style scoped>
/* 优雅的轻量滚动条美化 */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 9999px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>