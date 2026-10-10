<template>
  <header
    class="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-6 py-3"
  >
    <!-- 左侧区域：返回按钮 + 歌名编辑，利用 flex-1 与 min-w-0 自适应宽度 -->
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <el-button circle class="shrink-0 border-none" @click="handleBack">
        <el-icon>
          <Back />
        </el-icon>
      </el-button>

      <!-- 歌名与内联编辑区域：min-w-0 配合 w-full 与 flex-1 确保正确伸缩适配 -->
      <div class="flex max-w-50 min-w-0 flex-1 items-center gap-1.5">
        <input
          ref="titleInputRef"
          v-model="editingTitleText"
          type="text"
          :readonly="!isEditingTitle"
          class="w-full min-w-0 rounded-lg border px-2 py-1 text-lg font-bold text-slate-800 transition-all duration-200 focus:outline-none"
          :class="
            isEditingTitle
              ? 'border-slate-300 bg-white shadow-xs focus:border-slate-500'
              : 'border-transparent bg-transparent select-none'
          "
          :title="songTitle"
          @keydown.enter="saveTitle"
          @keydown.esc="cancelEditTitle"
          @blur="saveTitle"
        />

        <!-- 触发/保存按钮 -->
        <button
          type="button"
          class="shrink-0 rounded-md p-1.5 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600 active:scale-95"
          :title="isEditingTitle ? '保存歌名' : '修改歌名'"
          @click="toggleEditTitle"
        >
          <!-- 非编辑模式：显示编辑图标 -->
          <svg
            v-if="!isEditingTitle"
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          <!-- 编辑模式：显示保存勾选图标 -->
          <svg
            v-else
            class="h-4 w-4 text-emerald-600"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 右侧区域：使用 shrink-0 防止被宽度影响导致伸缩 -->
    <div class="flex shrink-0 items-center gap-3">
      <!-- <el-button type="primary" :disabled="loading" @click="statsVisible = true" >详情统计</el-button> -->

      <button
        type="button"
        class="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all duration-200 hover:bg-slate-800 hover:ring-1 hover:shadow-slate-500/20 hover:ring-slate-700/50 hover:brightness-125 active:scale-95"
        @click="handleSaveXml"
      >
        导出谱面
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Buffer } from 'buffer'

import { ElMessage } from 'element-plus'
import { XMLBuilder } from 'fast-xml-parser'
import iconv from 'iconv-lite'
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'

import { useAppStore } from '@/store/store'

// @ts-expect-error iconv需要这个东西
window.Buffer = Buffer

withDefaults(
  defineProps<{
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

const router = useRouter()
const appStore = useAppStore()

// 歌名编辑相关状态
const isEditingTitle = ref(false)
const titleInputRef = ref<HTMLInputElement | null>(null)

const handleBack = () => {
  router.replace('/')
}

// 读写计算属性：修改 songTitle 时自动同步更新 store
const songTitle = computed({
  get() {
    return appStore.currentSong?.xmlObject?.TITLE?.Name || '未命名歌曲'
  },
  set(newValue: string) {
    if (appStore.currentSong?.xmlObject?.TITLE) {
      appStore.currentSong.xmlObject.TITLE.Name = newValue
    }
  },
})

// 本地绑定的编辑值
const editingTitleText = ref(songTitle.value)

// 监听外部 songTitle 变化（例如数据加载完成时），在非编辑状态下同步更新
watch(
  songTitle,
  (val) => {
    if (!isEditingTitle.value) {
      editingTitleText.value = val
    }
  },
  { immediate: true },
)

const xmlObject = computed(() => appStore.currentSong?.xmlObject)

// 按钮点击处理：在编辑与保存状态之间切换
const toggleEditTitle = () => {
  if (isEditingTitle.value) {
    saveTitle()
  } else {
    isEditingTitle.value = true
    nextTick(() => {
      titleInputRef.value?.focus()
      titleInputRef.value?.select()
    })
  }
}

// 保存修改
const saveTitle = () => {
  if (!isEditingTitle.value) return
  const trimmed = editingTitleText.value.trim()
  if (trimmed) {
    songTitle.value = trimmed
  } else {
    // 为空时还原
    editingTitleText.value = songTitle.value
  }
  isEditingTitle.value = false
}

// 取消编辑
const cancelEditTitle = () => {
  editingTitleText.value = songTitle.value
  isEditingTitle.value = false
}

const handleSaveXml = () => {
  const xmlObj = xmlObject.value

  if (!xmlObj) {
    ElMessage.error('没有可保存的谱面数据！')
    return
  }

  // 打包时再补一个正常的长度，便于其他编辑器正常识别
  xmlObj.TITLE.LENGTH.Value = xmlObj.TITLE.AREA[xmlObj.TITLE.AREA.length - 1].Coord ?? '6666'

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
