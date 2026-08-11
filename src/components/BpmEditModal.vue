<template>
  <el-dialog :model-value="modelValue" title="编辑 BPM 列表" width="520px" align-center destroy-on-close class="rounded-2xl"
    @update:model-value="handleClose" @open="initLocalData">
    <div class="space-y-4">
      <!-- BPM 节点列表 -->
      <div class="max-h-90 space-y-2.5 overflow-y-auto pr-1">
        <div v-for="(item, index) in localList" :key="index"
          class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition-all hover:border-slate-200 hover:bg-slate-50">
          <!-- 序号标号 -->
          <span class="w-6 text-center font-mono text-xs font-semibold text-slate-400">
            #{{ index + 1 }}
          </span>

          <!-- Frame 输入框 -->
          <div class="flex-1">
            <label class="mb-1 block text-[11px] font-medium text-slate-400">
              Frame {{ index === 0 ? '(初始固定)' : '' }}
            </label>
            <input v-model="item.Frame" type="number" min="0" step="1" :disabled="index === 0" placeholder="请输入 Frame"
              class="w-full [appearance:textfield] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-700 transition-all focus:border-slate-500 focus:outline-hidden disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          </div>

          <!-- BPM 输入框 -->
          <div class="flex-1">
            <label class="mb-1 block text-[11px] font-medium text-slate-400">BPM</label>
            <input v-model="item.BPM" type="number" min="1" step="0.01" placeholder="请输入 BPM"
              class="w-full [appearance:textfield] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-700 transition-all focus:border-slate-500 focus:outline-hidden [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          </div>

          <!-- 删除按钮 (首个节点禁用) -->
          <div class="flex items-end pb-0.5">
            <button type="button" :disabled="index === 0"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              title="删除此 BPM 节点" @click="removeItem(index)">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 错误提示文本 -->
      <p v-if="errorMessage" class="text-xs font-medium text-rose-500">
        {{ errorMessage }}
      </p>

      <!-- 添加节点按钮 -->
      <button type="button"
        class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99]"
        @click="addItem">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        添加 BPM 节点
      </button>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2 pt-2">
        <button type="button"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          @click="handleClose(false)">
          取消
        </button>
        <button type="button"
          class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-slate-800 active:scale-95"
          @click="handleSave">
          保存修改
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { useAppStore } from '@/store/store'

interface BpmItem {
  Frame: string
  BPM: string
  OriginalBPM: string
}

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const appStore = useAppStore()

// 本地可编辑数据缓冲区
const localList = ref<BpmItem[]>([])
const errorMessage = ref('')

// 1. 打开弹窗时初始化数据
const initLocalData = () => {
  errorMessage.value = ''
  const bpmData = appStore.currentSong?.xmlObject?.TITLE?.BPM

  let rawList: BpmItem[] = []

  if (Array.isArray(bpmData)) {
    rawList = bpmData.map((item) => ({
      Frame: String(item.Frame ?? '0'),
      BPM: String(item.BPM ?? '120'),
      OriginalBPM: String(item.OriginalBPM ?? item.BPM ?? '120'),
    }))
  }

  // 保证至少有一个默认节点
  if (rawList.length === 0) {
    rawList = [{ Frame: '0', BPM: '120', OriginalBPM: '120' }]
  }

  // 确保第 1 个节点的 Frame 必须为 '0'
  rawList[0].Frame = '0'

  localList.value = rawList
}

// 2. 新增 BPM 节点
const addItem = () => {
  errorMessage.value = ''

  localList.value.push({
    Frame: '', // 留空，由用户输入
    BPM: '',
    OriginalBPM: '',
  })
}

// 3. 删除 BPM 节点 (第一个节点不可删)
const removeItem = (index: number) => {
  if (index === 0) return
  errorMessage.value = ''
  localList.value.splice(index, 1)
}

// 4. 关闭弹窗
const handleClose = (val: boolean) => {
  emit('update:modelValue', val)
}

// 5. 保存校验与数据回写
const handleSave = () => {
  errorMessage.value = ''

  // 基础校验：输入不能为空且必须合法
  for (let i = 0; i < localList.value.length; i++) {
    const item = localList.value[i]
    const frameNum = parseFloat(item.Frame)
    const bpmNum = parseFloat(item.BPM)

    if (item.Frame === '' || isNaN(frameNum)) {
      errorMessage.value = `第 ${i + 1} 项的 Frame 不能为空且必须为数字`
      return
    }
    if (item.BPM === '' || isNaN(bpmNum) || bpmNum <= 0) {
      errorMessage.value = `第 ${i + 1} 项的 BPM 必须为大于 0 的数字`
      return
    }
  }

  // 格式化并把 BPM 的值同步赋给 OriginalBPM
  const formattedList: BpmItem[] = localList.value.map((item, index) => {
    const bpmStr = String(parseFloat(item.BPM))
    return {
      Frame: index === 0 ? '0' : String(parseFloat(item.Frame)),
      BPM: bpmStr,
      OriginalBPM: bpmStr,
    }
  })

  // 按 Frame 升序排序 (保留第 1 个节点始终在最前面)
  const firstItem = formattedList[0]
  const restItems = formattedList.slice(1).sort((a, b) => parseFloat(a.Frame) - parseFloat(b.Frame))
  const sortedResult = [firstItem, ...restItems]

  // 写回 Store 中
  if (appStore.currentSong?.xmlObject?.TITLE) {
    appStore.currentSong.xmlObject.TITLE.BPM = sortedResult
  }

  handleClose(false)
}
</script>
