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

    <!-- 主卡片容器 -->
    <div class="w-full max-w-2xl space-y-6 rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
      <el-form ref="formRef" :model="songForm" :rules="rules" label-position="top" size="large">
        <!-- 1. 音频文件上传与播放区域 -->
        <el-form-item prop="audioFile">
          <template #label>
            <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <el-icon class="text-emerald-500">
                <Headset />
              </el-icon>
              <span>音频文件</span>
            </span>
          </template>

          <!-- 未上传：拖拽上传框 -->
          <el-upload v-if="!audioUrl" drag action="#" :auto-upload="false" :show-file-list="false"
            accept="audio/*,.mp3,.wav,.ogg,.flac" class="audio-uploader w-full" :on-change="handleAudioChange">
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

          <!-- 已上传：音频预览 -->
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

            <audio controls :src="audioUrl" class="mt-1 w-full rounded-lg accent-emerald-500"></audio>
          </div>
        </el-form-item>

        <!-- 2. XML 谱面文件上传与解析区域 -->
        <el-form-item prop="xmlObject">
          <template #label>
            <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <el-icon class="text-blue-500">
                <Document />
              </el-icon>
              <span>XML 谱面文件</span>
            </span>
          </template>

          <!-- 未上传 XML -->
          <el-upload v-if="!songForm.xmlObject" drag action="#" :auto-upload="false" :show-file-list="false"
            accept=".xml" class="xml-uploader w-full" :on-change="handleXmlChange">
            <div class="flex flex-col items-center justify-center space-y-3 py-6">
              <div
                class="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-500 shadow-inner">
                <el-icon :size="28">
                  <Document />
                </el-icon>
              </div>
              <div class="text-center">
                <p class="text-sm font-medium text-slate-700">点击或将 XML 文件拖拽至此处上传</p>
              </div>
            </div>
          </el-upload>

          <!-- 已解析 XML 信息展示 -->
          <div v-else
            class="flex w-full items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/40 p-4 transition-all">
            <div class="flex items-center gap-3 overflow-hidden">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-md shadow-blue-500/20">
                <el-icon :size="20">
                  <DocumentChecked />
                </el-icon>
              </div>
              <div class="truncate">
                <p class="truncate text-sm font-semibold text-slate-800">{{ xmlFileName }}</p>
                <p class="text-xs text-slate-400">
                  BGM: {{ songForm.xmlObject.TITLE?.BGM?.Name || '未标明' }}
                </p>
              </div>
            </div>
            <el-button circle size="small"
              class="border-none bg-slate-200/60 text-slate-600 hover:bg-rose-100 hover:text-rose-600"
              @click="removeXml">
              <el-icon>
                <Delete />
              </el-icon>
            </el-button>
          </div>
        </el-form-item>

        <!-- 底部操作按钮 -->
        <div class="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <el-button size="large" class="rounded-xl" @click="handleBack">取消</el-button>
          <el-button type="primary" size="large" class="rounded-xl border-none bg-emerald-500 hover:bg-emerald-600"
            @click="handleSave">
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
import { ref, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { useSongStorage } from '@/db/useSongStorage'
import { useAppStore, type SongData, type SongXmlData } from '@/store/store'

const router = useRouter()
const { setCurrentSong } = useAppStore()
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
}

// 将 File 对象转为指定编码字符串的辅助函数
const readFileAsTextWithSmartEncoding = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer

        // 1. 默认使用兼容性最强的中文字符集解码（GB18030 覆盖了 GBK、GB2312 和大部分韩文字符）
        let currentEncoding = 'gb18030'
        let decoder = new TextDecoder(currentEncoding)
        let text = decoder.decode(buffer)

        // 2. 提取 XML 里的 encoding 声明
        const match = text.match(/<\?xml[^?>]*encoding=["']([^"']+)["']/i)
        const declaredEncoding = match?.[1]?.toLowerCase()

        // 3. 如果 XML 明确声明了 UTF-8，并且文件确实是 UTF-8，才重新解码
        // (注意：如果声明是 euc-kr，但包含了 GBK 中文，则继续保留 gb18030 以防乱码)
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
    // 替换原有的 await uploadFile.raw.text()
    const xmlText = await readFileAsTextWithSmartEncoding(uploadFile.raw)

    // 配置 XMLParser 保持属性与节点的正确提取
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
}

import { toRaw } from 'vue'

// 保存并跳转
const handleSave = async () => {
  if (!formRef.value) return

  await formRef.value.validate()

  if (!songForm.audioFile || !songForm.xmlObject) return

  const rawXmlObject = JSON.parse(JSON.stringify(toRaw(songForm.xmlObject)))

  const songPayload = {
    audioFile: songForm.audioFile,
    backingTracks: [],
    xmlObject: rawXmlObject,
  }

  try {
    // 1. 存入 Dexie 数据库获取真实生成的主键 id
    const newId = await addSong(songPayload)

    // 2. 写入 Pinia
    setCurrentSong({
      ...songPayload,
      id: newId,
    })

    // 3. 路由跳转
    router.push('/note-editor')
  } catch (err) {
    console.error('存储失败:', err)
    ElMessage.error('数据库存储失败')
  }
}

onUnmounted(() => {
  removeAudio()
})
</script>

<style scoped>
:deep(.el-upload-dragger) {
  border-radius: 1rem;
  border-color: #cbd5e1;
  background-color: #f8fafc;
  transition: all 0.2s ease;
}

:deep(.el-upload-dragger:hover) {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

:deep(.el-form-item) {
  margin-bottom: 1.25rem;
}
</style>
