<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
    <!-- 顶部导航 / 返回栏 -->
    <div class="mb-6 flex w-full max-w-2xl items-center justify-between">
      <div class="flex items-center gap-3">
        <el-button circle class="border-slate-200 text-slate-600 hover:text-slate-900" @click="handleBack">
          <el-icon>
            <Back />
          </el-icon>
        </el-button>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-800">新建歌曲</h1>
        </div>
      </div>
    </div>

    <!-- 主卡片容器 -->
    <div class="w-full max-w-2xl space-y-6 rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
      <el-form ref="formRef" :model="songForm" :rules="rules" label-position="top" size="large">
        <!-- 1. 音频文件上传与播放区域 -->
        <el-form-item prop="audioFile">
          <template #label>
            <span class="inline-flex items-center gap-1.5">
              <el-icon class="text-emerald-500">
                <Headset />
              </el-icon>
              <span>音频文件</span>
            </span>
          </template>

          <!-- 状态 A：未上传文件，展示拖拽上传框 -->
          <el-upload v-if="!audioUrl" ref="uploadRef" drag action="#" :auto-upload="false" :show-file-list="false"
            accept="audio/*,.mp3,.wav,.ogg,.aac,.flac,.m4a" class="audio-uploader w-full" :on-change="handleFileChange">
            <div class="flex flex-col items-center justify-center space-y-3 py-6">
              <div
                class="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 shadow-inner">
                <el-icon :size="28">
                  <UploadFilled />
                </el-icon>
              </div>
              <div class="text-center">
                <p class="text-sm font-medium text-slate-700">点击或将音频文件拖拽至此处上传</p>
              </div>
            </div>
          </el-upload>

          <!-- 状态 B：已上传文件，展示播放器预览界面 -->
          <div v-else
            class="flex w-full flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 transition-all">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 overflow-hidden">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                  <el-icon :size="20">
                    <VideoPlay />
                  </el-icon>
                </div>
                <div class="truncate">
                  <p class="truncate text-sm font-semibold text-slate-800">{{ audioFileName }}</p>
                  <p class="text-xs text-slate-400">音频就绪，点击下方播放器进行预览</p>
                </div>
              </div>
              <el-button circle size="small"
                class="border-none bg-slate-200/60 text-slate-600 hover:bg-rose-100 hover:text-rose-600"
                @click="removeAudio">
                <el-icon>
                  <Delete />
                </el-icon>
              </el-button>
            </div>

            <!-- 原生 Audio 控制条 -->
            <audio controls :src="audioUrl" class="mt-1 w-full rounded-lg accent-emerald-500"></audio>
          </div>
        </el-form-item>

        <!-- 将 歌曲名称 与 BPM 放在同一行（两列网格布局） -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- 1. 歌曲名称 -->
          <el-form-item prop="title">
            <template #label>
              <span class="inline-flex items-center gap-1.5">
                <span>歌曲名称</span>
              </span>
            </template>
            <el-input v-model="songForm.title" placeholder="请输入歌曲名称" clearable />
          </el-form-item>

          <!-- 2. 歌曲速度 (BPM) -->
          <el-form-item prop="bpm">
            <template #label>
              <span class="inline-flex items-center gap-1.5">
                <span>歌曲速度 (BPM)</span>
              </span>
            </template>
            <el-input-number v-model="songForm.bpm" :min="1" :max="999" :controls="false" class="w-full!" />
          </el-form-item>
        </div>

        <!-- 底部操作按钮 -->
        <div class="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <el-button size="large" class="rounded-xl" @click="handleBack">取消</el-button>
          <el-button type="primary" size="large" class="rounded-xl border-none bg-emerald-500 hover:bg-emerald-600"
            @click="handleSave">
            创建
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Back, Headset, UploadFilled, VideoPlay, Delete } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import { ref, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { useSongStorage } from '@/db/useSongStorage'
import { useAppStore, type SongXmlData } from '@/store/store'

const router = useRouter()

const { setCurrentSong } = useAppStore()
const { addSong } = useSongStorage()

// 表单引用与状态
const formRef = ref<FormInstance>()
const songForm = reactive<{
  title: string
  bpm: number
  audioFile?: File | null
}>({
  title: '',
  bpm: 150,
  audioFile: null,
})

// 表单校验规则
const rules = reactive<FormRules>({
  audioFile: [{ required: true, message: '请上传音频文件', trigger: 'change' }],
  title: [
    { required: true, message: '请输入歌曲名称', trigger: 'blur' },
    {
      validator: (_, value, callback) => {
        if (!value || !value.trim()) {
          callback(new Error('歌曲名称不能为空或纯空格'))
        } else {
          callback()
        }
      },
      trigger: ['blur', 'change'],
    },
  ],
  bpm: [{ required: true, message: '请输入歌曲速度 (BPM)', trigger: 'change' }],
})

const audioUrl = ref('')
const audioFileName = ref('')

// 返回路由逻辑
const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/')
  }
}

// 处理音频文件选择事件
const handleFileChange = (uploadFile: UploadFile) => {
  if (!uploadFile.raw) return

  songForm.audioFile = uploadFile.raw
  audioFileName.value = uploadFile.name

  // 未手动填写标题时，默认自动填入去掉扩展名的文件名
  if (!songForm.title) {
    songForm.title = uploadFile.name.replace(/\.[^/.]+$/, '')
    formRef.value?.validateField('title')
  }

  // 为本地文件创建 ObjectURL 供播放器预览
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  audioUrl.value = URL.createObjectURL(uploadFile.raw)

  // 主动触发音频字段的表单校验
  formRef.value?.validateField('audioFile')
}

// 移除音频
const removeAudio = () => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  audioUrl.value = ''
  audioFileName.value = ''
  songForm.audioFile = null
}

// 保存提交
const handleSave = async () => {
  if (!formRef.value) return

  await formRef.value.validate()

  const xmlData = {
    '?xml': {
      version: '1.0',
      encoding: 'euc-kr',
    },
    TITLE: {
      Name: songForm.title.trim(),
      BPM: [
        {
          Frame: '0',
          BPM: songForm.bpm.toString(),
          OriginalBPM: songForm.bpm.toString(),
        },
      ],
      BGM: {
        Name: songForm.audioFile?.name,
        Volume: '1.00',
      },
      DELAY: {
        Value: '0',
      },
      LENGTH: {
        Value: '0',
      },
      AREA: [],
    },
  } as SongXmlData

  const newSongData = {
    audioFile: songForm.audioFile!,
    backingTracks: [],
    xmlObject: xmlData,
  }

  // 先存入 IndexedDB 数据库，获取自增生成的主键 id
  const newId = await addSong(newSongData)

  setCurrentSong({
    id: newId,
    audioFile: songForm.audioFile!,
    backingTracks: [],
    xmlObject: xmlData,
  })

  router.push('/note-editor')
}

onUnmounted(() => {
  removeAudio()
})
</script>

<style scoped>
/* 定制 el-upload 拖拽框的虚线与圆角风格 */
:deep(.el-upload-dragger) {
  border-radius: 1rem;
  border-color: #cbd5e1;
  background-color: #f8fafc;
  transition: all 0.2s ease;
}

:deep(.el-upload-dragger:hover) {
  border-color: #10b981;
  background-color: #f0fdf4;
}

/* 优化 el-form 项底部的校验错误提示间距 */
:deep(.el-form-item) {
  margin-bottom: 1.25rem;
}
</style>
