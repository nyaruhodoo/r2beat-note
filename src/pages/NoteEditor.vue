<template>
  <div class="flex h-screen w-full flex-col bg-slate-100 p-6">
    <header class="mb-4 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-6 py-3">
      <div class="flex items-center gap-3">
        <el-button circle @click="router.replace('/')" class="border-none">
          <el-icon>
            <Back />
          </el-icon>
        </el-button>
        <h1 class="text-lg font-bold text-slate-800">谱面编辑器</h1>
      </div>
      <div class="flex items-center gap-3">
        <el-button type="primary" @click="handleSaveXml">导出谱面</el-button>
      </div>
    </header>

    <div class="flex flex-1 gap-6 overflow-hidden">
      <!-- 左侧：歌曲信息 -->
      <div class="min-w-70 flex-1">
        <SongInfoPanel ref="songInfoPanelRef" />
      </div>

      <!-- 中间：直接在模板里组装对象，Vue 会自动深度解包 ref 保持响应式 -->
      <RhythmCanvas v-if="songInfoPanelRef" :current-time="songInfoPanelRef?.currentTime"
        :current-frame="songInfoPanelRef?.currentFrame" :current-coord="songInfoPanelRef?.currentCoord"
        :playback-rate="songInfoPanelRef?.playbackRate" :bpm="songInfoPanelRef?.bpmValue"
        :seek-to="songInfoPanelRef?.seekTo" :isPlaying="songInfoPanelRef?.isPlaying" :pause="songInfoPanelRef?.pause"
        :duration="songInfoPanelRef?.duration" />

      <!-- 右侧：障碍物选择器 -->
      <div class="min-w-120 flex-1">
        <ObstacleSelector />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { XMLBuilder } from 'fast-xml-parser'
import { ElMessage } from 'element-plus'
import iconv from 'iconv-lite'
import { Buffer } from 'buffer'

import ObstacleSelector from '@/components/ObstacleSelector.vue'
import RhythmCanvas from '@/components/RhythmCanvas.vue'
import SongInfoPanel from '@/components/SongInfoPanel.vue'
import { useAppStore } from '@/store/store'

// @ts-expect-error  iconv需要这个东西
window.Buffer = Buffer

const appStore = useAppStore()
const router = useRouter()
const songInfoPanelRef = ref<InstanceType<typeof SongInfoPanel> | null>(null)


const handleSaveXml = () => {
  const xmlObj = appStore.currentSong?.xmlObject

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

    let rawXmlString = builder.build(xmlObj)

    // 2. 将字符串转换为 EUC-KR 编码的 Buffer
    const eucKrBuffer = iconv.encode(rawXmlString, 'euc-kr')

    // 3. 使用 Buffer 生成指定 charset 的 Blob
    const blob = new Blob([eucKrBuffer], { type: 'application/xml;charset=euc-kr' })

    const titleObj = xmlObj.TITLE
    const fileName = titleObj?.Name

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