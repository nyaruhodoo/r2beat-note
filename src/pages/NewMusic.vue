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

    <!-- 主卡片容器：优化了阴影(shadow-lg + fine ring)和圆角 -->
    <div
      class="w-full max-w-2xl space-y-6 rounded-3xl bg-white p-10 shadow-lg shadow-slate-950/5 ring-1 ring-slate-100">
      <el-form ref="formRef" :model="songForm" :rules="rules" label-position="top" size="large">
        <!-- 1. 音频文件上传与播放区域 -->
        <el-form-item prop="audioFile">
          <template #label>
            <span class="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <el-icon class="text-emerald-500">
                <Headset />
              </el-icon>
              <span>音频文件</span>
            </span>
          </template>

          <!-- 状态 A：未上传文件，展示拖拽上传框。添加定制 class 'fixed-height-dragger' -->
          <el-upload v-if="!audioUrl" ref="uploadRef" drag action="#" :auto-upload="false" :show-file-list="false"
            accept="audio/*,.mp3,.wav,.ogg,.aac,.flac,.m4a" class="audio-uploader fixed-height-dragger w-full"
            :on-change="handleFileChange">
            <div class="flex flex-col items-center justify-center space-y-3">
              <div
                class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 shadow-inner ring-4 ring-emerald-50/50">
                <el-icon :size="32">
                  <UploadFilled />
                </el-icon>
              </div>
              <div class="text-center">
                <p class="text-base font-semibold text-slate-800">点击或将音频文件拖拽至此处</p>
              </div>
            </div>
          </el-upload>

          <!-- 状态 B：已上传文件，展示播放器预览界面 -->
          <div v-else
            class="flex w-full flex-col gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 transition-all shadow-inner shadow-emerald-100/50">
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-3.5 overflow-hidden">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                  <el-icon :size="24">
                    <VideoPlay />
                  </el-icon>
                </div>
                <div class="truncate">
                  <p class="truncate text-base font-semibold text-slate-900">{{ audioFileName }}</p>
                  <p class="text-xs text-emerald-700/80 font-medium">音频就绪，点击下方播放器进行预览</p>
                </div>
              </div>
              <el-button circle
                class="border-none bg-white/80 text-slate-500 hover:bg-rose-50 hover:text-rose-600 shadow-sm"
                @click="removeAudio">
                <el-icon>
                  <Delete />
                </el-icon>
              </el-button>
            </div>

            <!-- 原生 Audio 控制条 -->
            <audio controls :src="audioUrl" class="w-full rounded-full accent-emerald-500"></audio>
          </div>
        </el-form-item>

        <!-- 将 歌曲名称 与 BPM 放在同一行（两列网格布局） -->
        <div class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <!-- 1. 歌曲名称 -->
          <el-form-item prop="title">
            <template #label>
              <span class="font-medium text-slate-700">歌曲名称</span>
            </template>
            <el-input v-model="songForm.title" placeholder="请输入歌曲名称" clearable class="custom-input" />
          </el-form-item>

          <!-- 2. 歌曲速度 (BPM) -->
          <el-form-item prop="bpm">
            <template #label>
              <span class="font-medium text-slate-700">默认 BPM (可以随时更改)</span>
            </template>
            <el-input-number v-model="songForm.bpm" :min="1" :max="999" :controls="false" placeholder="150"
              class="w-full! custom-input-number" />
          </el-form-item>
        </div>

        <!-- 底部操作按钮 -->
        <div class="mt-10 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
          <el-button size="large" class="rounded-xl px-6 border-slate-200 text-slate-700 hover:bg-slate-50"
            @click="handleBack">取消</el-button>
          <el-button type="primary" size="large" class="rounded-xl px-8" @click="handleSave">
            创建歌曲
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

// 注意：这里假设你原有的业务逻辑引入路径是正确的
import { useSongStorage } from '@/db/useSongStorage'
import { type SongXmlData } from '@/store/store'

const router = useRouter()

// 容错处理：如果 useSongStorage 不可用，mock 一个 addSong 方法，防止报错
let addSong: (data: any) => Promise<string | number>;
try {
  const storage = useSongStorage();
  addSong = storage.addSong;
} catch (e) {
  console.warn('useSongStorage 引入失败，使用 Mock 方法');
  addSong = async () => 'mock-id-' + Date.now();
}

// 表单引用与状态
const formRef = ref<FormInstance>()
const songForm = reactive<{
  title: string
  bpm: number | undefined // 允许初始为空
  audioFile: File | null
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
          callback(new Error('歌曲名称不能为空'))
        } else {
          callback()
        }
      },
      trigger: ['blur', 'change'],
    },
  ],
  bpm: [{ required: true, message: '请输入 BPM', trigger: 'change' }],
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
  // 清除文件对象后，再次触发校验显示错误提示
  formRef.value?.validateField('audioFile')
}

// 保存提交
const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch (error) {
    console.log('表单校验失败', error)
    return
  }

  // 确保 bpm 有值，否则给个默认值
  const finalBpm = songForm.bpm?.toString() || '150';

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
          BPM: finalBpm,
          OriginalBPM: finalBpm,
        },
      ],
      BGM: {
        Name: songForm.audioFile?.name || '',
        Volume: '1.00',
      },
      DELAY: {
        Value: '0',
      },
      // 这个参数对我无用，随便给个默认值即可
      LENGTH: {
        Value: '6666',
      },
      AREA: [],
    },
  } as SongXmlData

  const newSongData = {
    audioFile: songForm.audioFile!,
    backingTracks: [],
    xmlObject: xmlData,
  }

  const newId = await addSong(newSongData)

  router.replace(`/note-editor/${newId}`)
}

onUnmounted(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})
</script>

<style scoped>
/* 1. 修正拖拽高度抖动：关键在于给 dragger 设置固定高度 */
:deep(.fixed-height-dragger .el-upload-dragger) {
  height: 180px;
  /* 设置一个固定高度，防止拖拽时因边框变化导致高度抖动 */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1.25rem;
  /* 稍大一点的圆角，更现代 */
  border-width: 2px;
  /* 默认两像素边框 */
  border-color: #e2e8f0;
  /* slate-200 */
  background-color: #f8fafc;
  /* slate-50 */
  transition: all 0.25s ease-in-out;
}

/* 拖拽悬停或文件在其上方时的样式 */
:deep(.fixed-height-dragger .el-upload-dragger:hover),
:deep(.fixed-height-dragger .el-upload--text.is-dragover .el-upload-dragger) {
  border-color: #10b981;
  /* emerald-500 */
  background-color: #f0fdf4;
  /* emerald-50 */
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
  /* 增加一个淡淡的内阴影脉冲效果，而不是改变高度 */
}

/* 2. 优化 el-form 项底部的校验错误提示间距 */
:deep(.el-form-item) {
  margin-bottom: 1.75rem;
  /* 增加间距，减少拥挤感 */
}

:deep(.el-form-item__label) {
  padding-bottom: 6px !important;
}

/* 3. 输入框 UI 微调 */
:deep(.custom-input .el-input__wrapper),
:deep(.custom-input-number .el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
  /* slate-200 */
}

:deep(.custom-input .el-input__wrapper.is-focus),
:deep(.custom-input-number .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #10b981 inset !important;
  /* emerald-500 */
  right: 2px;
  --el-input-focus-border-color: #10b981;
}
</style>