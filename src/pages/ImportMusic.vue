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
          <h1 class="text-2xl font-bold tracking-tight text-slate-800">导入歌曲</h1>
        </div>
      </div>
    </div>

    <!-- 主卡片容器：优化阴影(shadow-lg + fine ring)和圆角 -->
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

          <!-- 未上传：拖拽上传框（添加固定高度 class 防止抖动） -->
          <el-upload v-if="!audioUrl" drag action="#" :auto-upload="false" :show-file-list="false"
            accept="audio/*,.mp3,.wav,.ogg,.flac" class="audio-uploader fixed-height-dragger w-full"
            :on-change="handleAudioChange">
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

          <!-- 已上传：音频预览 -->
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

            <audio controls :src="audioUrl" class="w-full rounded-full accent-emerald-500"></audio>
          </div>
        </el-form-item>

        <!-- 2. XML 谱面文件上传与解析区域 -->
        <el-form-item prop="xmlObject">
          <template #label>
            <span class="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <el-icon class="text-blue-500">
                <Document />
              </el-icon>
              <span>XML 谱面文件</span>
            </span>
          </template>

          <!-- 未上传 XML（添加固定高度 class 防止抖动） -->
          <el-upload v-if="!songForm.xmlObject" drag action="#" :auto-upload="false" :show-file-list="false"
            accept=".xml" class="xml-uploader fixed-height-dragger-blue w-full" :on-change="handleXmlChange">
            <div class="flex flex-col items-center justify-center space-y-3">
              <div
                class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500 shadow-inner ring-4 ring-blue-50/50">
                <el-icon :size="32">
                  <Document />
                </el-icon>
              </div>
              <div class="text-center">
                <p class="text-base font-semibold text-slate-800">点击或将 XML 文件拖拽至此处</p>
              </div>
            </div>
          </el-upload>

          <!-- 已解析 XML 信息展示 -->
          <div v-else
            class="flex w-full items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/50 p-5 transition-all shadow-inner shadow-blue-100/50">
            <div class="flex items-center gap-3.5 overflow-hidden">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                <el-icon :size="24">
                  <DocumentChecked />
                </el-icon>
              </div>
              <div class="truncate">
                <p class="truncate text-base font-semibold text-slate-900">{{ xmlFileName }}</p>
                <p class="text-xs text-blue-700/80 font-medium">
                  BGM: {{ songForm.xmlObject.TITLE?.BGM?.Name || '未标明' }}
                </p>
              </div>
            </div>
            <el-button circle
              class="border-none bg-white/80 text-slate-500 hover:bg-rose-50 hover:text-rose-600 shadow-sm"
              @click="removeXml">
              <el-icon>
                <Delete />
              </el-icon>
            </el-button>
          </div>
        </el-form-item>

        <!-- 底部操作按钮 -->
        <div class="mt-10 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
          <el-button size="large" class="rounded-xl px-6 border-slate-200 text-slate-700 hover:bg-slate-50"
            @click="handleBack">取消</el-button>
          <el-button type="primary" size="large" class="rounded-xl px-8 border-none" @click="handleSave">
            导入并编辑
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Back,
  Headset,
  UploadFilled,
  VideoPlay,
  Delete,
  Document,
  DocumentChecked,
} from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import { ElMessage } from 'element-plus'
import { XMLParser } from 'fast-xml-parser'
import { ref, reactive, onUnmounted, toRaw } from 'vue'
import { useRouter } from 'vue-router'

import { useSongStorage } from '@/db/useSongStorage'
import { type SongXmlData } from '@/store/store'

const router = useRouter()
const { addSong } = useSongStorage()

const formRef = ref<FormInstance>()

// 表单数据
const songForm = reactive<{
  audioFile?: File | null
  xmlObject?: SongXmlData | null
}>({
  audioFile: null,
  xmlObject: null,
})

// 表单校验规则
const rules = reactive<FormRules>({
  audioFile: [{ required: true, message: '请上传音频文件', trigger: 'change' }],
  xmlObject: [{ required: true, message: '请上传并解析 XML 文件', trigger: 'change' }],
})

// 文件与预览状态
const audioUrl = ref('')
const audioFileName = ref('')
const xmlFileName = ref('')

// 返回逻辑
const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/')
  }
}

// 处理音频上传
const handleAudioChange = (uploadFile: UploadFile) => {
  if (!uploadFile.raw) return

  songForm.audioFile = uploadFile.raw
  audioFileName.value = uploadFile.name

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  audioUrl.value = URL.createObjectURL(uploadFile.raw)
  formRef.value?.validateField('audioFile')
}

// 清除音频
const removeAudio = () => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  audioUrl.value = ''
  audioFileName.value = ''
  songForm.audioFile = null
  formRef.value?.validateField('audioFile')
}

// 将 File 对象转为指定编码字符串的辅助函数
const readFileAsTextWithSmartEncoding = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer

        // 1. 默认使用 GB18030（覆盖 GBK, GB2312 和大部分韩文字符）
        let currentEncoding = 'gb18030'
        let decoder = new TextDecoder(currentEncoding)
        let text = decoder.decode(buffer)

        // 2. 提取 XML 里的 encoding 声明
        const match = text.match(/<\?xml[^?>]*encoding=["']([^"']+)["']/i)
        const declaredEncoding = match?.[1]?.toLowerCase()

        // 3. 明确声明 utf-8 时重新解码
        if (declaredEncoding && declaredEncoding === 'utf-8') {
          currentEncoding = 'utf-8'
          decoder = new TextDecoder(currentEncoding)
          text = decoder.decode(buffer)
        }

        resolve(text)
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = (err) => reject(err)
    reader.readAsArrayBuffer(file)
  })
}

// 处理 XML 导入与解析
const handleXmlChange = async (uploadFile: UploadFile) => {
  if (!uploadFile.raw) return

  try {
    const xmlText = await readFileAsTextWithSmartEncoding(uploadFile.raw)

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
    })

    const parsedResult = parser.parse(xmlText) as SongXmlData

    if (parsedResult.TITLE && parsedResult.TITLE.BPM && !Array.isArray(parsedResult.TITLE.BPM)) {
      parsedResult.TITLE.BPM = [parsedResult.TITLE.BPM]
    }

    songForm.xmlObject = parsedResult
    xmlFileName.value = uploadFile.name
    formRef.value?.validateField('xmlObject')
  } catch (error) {
    console.error('XML 解析失败:', error)
    ElMessage.error('XML 文件格式不正确，解析失败')
  }
}

// 清除 XML
const removeXml = () => {
  songForm.xmlObject = null
  xmlFileName.value = ''
  formRef.value?.validateField('xmlObject')
}

// 保存并跳转
const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch (error) {
    console.log('校验未通过', error)
    return
  }

  if (!songForm.audioFile || !songForm.xmlObject) return

  const rawXmlObject = JSON.parse(JSON.stringify(toRaw(songForm.xmlObject)))

  const songPayload = {
    audioFile: songForm.audioFile,
    backingTracks: [],
    xmlObject: rawXmlObject,
  }

  try {
    const newId = await addSong(songPayload)
    router.replace(`/note-editor/${newId}`)
  } catch (err) {
    console.error('存储失败:', err)
    ElMessage.error('数据库存储失败')
  }
}

onUnmounted(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})
</script>

<style scoped>
/* 1. 消除拖拽时的抖动：固定拖拽框高度 */
:deep(.fixed-height-dragger .el-upload-dragger),
:deep(.fixed-height-dragger-blue .el-upload-dragger) {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1.25rem;
  border-width: 2px;
  border-color: #e2e8f0;
  background-color: #f8fafc;
  transition: all 0.25s ease-in-out;
}

/* 音频上传框 Hover / Dragover 逻辑 */
:deep(.fixed-height-dragger .el-upload-dragger:hover),
:deep(.fixed-height-dragger .el-upload--text.is-dragover .el-upload-dragger) {
  border-color: #10b981;
  /* emerald-500 */
  background-color: #f0fdf4;
  /* emerald-50 */
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
}

/* XML 上传框 Hover / Dragover 逻辑（主题蓝色） */
:deep(.fixed-height-dragger-blue .el-upload-dragger:hover),
:deep(.fixed-height-dragger-blue .el-upload--text.is-dragover .el-upload-dragger) {
  border-color: #3b82f6;
  /* blue-500 */
  background-color: #eff6ff;
  /* blue-50 */
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

/* 2. 优化表单项间距 */
:deep(.el-form-item) {
  margin-bottom: 1.75rem;
}

:deep(.el-form-item__label) {
  padding-bottom: 6px !important;
}
</style>