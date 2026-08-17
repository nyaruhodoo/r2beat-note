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
      <!--  <el-button type="primary" :disabled="loading" @click="statsVisible = true" >详情统计</el-button> -->

      <button type="button"
        class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-slate-800 hover:shadow-slate-500/20 hover:ring-1 hover:ring-slate-700/50 hover:brightness-125 active:scale-95 transition-all duration-200 cursor-pointer"
        @click="handleSaveXml">
        导出谱面
      </button>
    </div>
  </header>

  <!-- 详情统计对话框 -->
  <MusicStatistics v-model:visible="statsVisible"></MusicStatistics>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { XMLBuilder } from 'fast-xml-parser'
import { ElMessage } from 'element-plus'
import iconv from 'iconv-lite'
import { Buffer } from 'buffer'


import { useAppStore } from '@/store/store'
import MusicStatistics from './MusicStatistics.vue'

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

// 控制统计弹窗显隐
const statsVisible = ref(false)

// 直接从 appStore 获取歌曲名称与 xml 对象
const songTitle = computed(() => appStore.currentSong?.xmlObject?.TITLE?.Name || '未命名歌曲')
const xmlObject = computed(() => appStore.currentSong?.xmlObject)

const handleSaveXml = () => {
  const xmlObj = xmlObject.value

  if (!xmlObj) {
    ElMessage.error('没有可保存的谱面数据！')
    return
  }

  // 打包时再补一个正常的长度，便于其他编辑器正常识别
  xmlObj.TITLE.LENGTH.Value = xmlObj.TITLE.AREA[xmlObj.TITLE.AREA.length - 1].Coord ?? "6666"

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
