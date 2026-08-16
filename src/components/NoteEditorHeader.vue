<template>
  <header class="mb-4 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-6 py-3">
    <div class="flex items-center gap-3">
      <el-button circle class="border-none" @click="router.back()">
        <el-icon>
          <Back />
        </el-icon>
      </el-button>
      <h1 class="text-lg font-bold text-slate-800">{{ songTitle }}</h1>
    </div>
    <div class="flex items-center gap-3">
      <el-button type="primary" :disabled="loading" @click="handleSaveXml">导出谱面</el-button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { XMLBuilder } from 'fast-xml-parser'
import { ElMessage } from 'element-plus'
import iconv from 'iconv-lite'
import { Buffer } from 'buffer'

import { useAppStore } from '@/store/store'

// @ts-expect-error iconv需要这个东西
window.Buffer = Buffer

withDefaults(
  defineProps<{
    loading?: boolean
  }>(),
  {
    loading: false
  }
)

const router = useRouter()
const appStore = useAppStore()

// 直接从 appStore 获取歌曲名称与 xml 对象
const songTitle = computed(() => appStore.currentSong?.xmlObject?.TITLE?.Name || '未命名歌曲')
const xmlObject = computed(() => appStore.currentSong?.xmlObject)

const handleSaveXml = () => {
  const xmlObj = xmlObject.value

  if (!xmlObj) {
    ElMessage.error('没有可保存的谱面数据！')
    return
  }

  try {
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      format: true,
      indentBy: '',
      suppressEmptyNode: false,
    })

    const rawXmlString = builder.build(xmlObj)

    // 转换为 EUC-KR 编码的 Buffer
    const eucKrBuffer = iconv.encode(rawXmlString, 'euc-kr')

    // 使用 Buffer 生成指定 charset 的 Blob
    const blob = new Blob([eucKrBuffer], { type: 'application/xml;charset=euc-kr' })

    const titleObj = xmlObj.TITLE
    const fileName = titleObj?.Name || '未命名歌曲'

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName}.xml`
    document.body.appendChild(link)
    link.click()

    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    ElMessage.success('谱面导出成功！')
  } catch (error) {
    console.error('保存 XML 失败:', error)
    ElMessage.error('谱面导出失败，请检查控制台输出')
  }
}
</script>