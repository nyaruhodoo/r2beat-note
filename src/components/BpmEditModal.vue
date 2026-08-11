<template>
  <el-dialog :model-value="modelValue" title="编辑 BPM 列表" width="600px" align-center destroy-on-close
    class="bpm-edit-dialog rounded-2xl" @update:model-value="handleClose" @open="initLocalData">
    <div class="space-y-3">
      <!-- 顶部功能栏：数据统计与操作 -->
      <div class="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
        <span class="font-medium">
          显示 <strong class="font-mono text-slate-900">{{ displayList.length }}</strong> / {{ localList.length }} 个节点
        </span>
        <div class="flex items-center gap-2">
          <!-- 正序 / 倒序 切换按钮 -->
          <button type="button"
            class="flex items-center gap-1 rounded bg-white px-2 py-1 text-slate-600 shadow-xs hover:bg-slate-50 transition-colors"
            @click="isReversed = !isReversed">
            <span>{{ isReversed ? '从后往前 (倒序)' : '从前往后 (正序)' }}</span>
            <svg class="h-3.5 w-3.5" :class="{ 'rotate-180': isReversed }" fill="none" stroke="currentColor"
              stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 筛选控制区域 -->
      <div class="grid grid-cols-12 gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-2 text-xs">
        <!-- Frame 范围筛选 -->
        <div class="col-span-6 flex items-center gap-1.5">
          <span class="text-slate-400 font-medium shrink-0">Frame:</span>
          <input v-model="filterForm.minFrame" type="number" placeholder="Min"
            class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-slate-700 transition-all focus:border-slate-500 focus:outline-none" />
          <span class="text-slate-300">-</span>
          <input v-model="filterForm.maxFrame" type="number" placeholder="Max"
            class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-slate-700 transition-all focus:border-slate-500 focus:outline-none" />
        </div>

        <!-- BPM 范围筛选 -->
        <div class="col-span-5 flex items-center gap-1.5">
          <span class="text-slate-400 font-medium shrink-0">BPM:</span>
          <input v-model="filterForm.minBpm" type="number" placeholder="Min"
            class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-slate-700 transition-all focus:border-slate-500 focus:outline-none" />
          <span class="text-slate-300">-</span>
          <input v-model="filterForm.maxBpm" type="number" placeholder="Max"
            class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-slate-700 transition-all focus:border-slate-500 focus:outline-none" />
        </div>

        <!-- 重置筛选按钮 -->
        <div class="col-span-1 flex items-center justify-end">
          <button type="button" class="text-xs text-slate-400 hover:text-slate-600 transition-colors" title="重置筛选条件"
            @click="resetFilter">
            重置
          </button>
        </div>
      </div>

      <!-- 表头 (固定) -->
      <div
        class="grid grid-cols-12 gap-2 px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100">
        <div class="col-span-2">原序号</div>
        <div class="col-span-4">Frame (帧)</div>
        <div class="col-span-4">BPM</div>
        <div class="col-span-2 text-center">操作</div>
      </div>

      <!-- BPM 节点列表 (视图区) -->
      <div class="max-h-[340px] min-h-[200px] overflow-y-auto space-y-1.5 pr-1 text-xs">
        <template v-if="displayList.length > 0">
          <div v-for="item in displayList" :key="item.rawIndex"
            class="grid grid-cols-12 gap-2 items-center rounded-lg border border-slate-100 bg-slate-50/50 p-1.5 transition-all hover:border-slate-200 hover:bg-slate-50">
            <!-- 原始序号 -->
            <div class="col-span-2 pl-1 font-mono text-slate-400 font-medium">
              #{{ item.rawIndex + 1 }}
            </div>

            <!-- Frame 输入框 -->
            <div class="col-span-4">
              <input v-model="item.Frame" type="number" min="0" step="1" :disabled="item.rawIndex === 0"
                :placeholder="item.rawIndex === 0 ? '0 (固定)' : 'Frame'"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-700 transition-all focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>

            <!-- BPM 输入框 -->
            <div class="col-span-4">
              <input v-model="item.BPM" type="number" min="1" step="0.01" placeholder="BPM"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-700 transition-all focus:border-slate-500 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>

            <!-- 删除按钮 -->
            <div class="col-span-2 flex justify-center">
              <button type="button" :disabled="item.rawIndex === 0"
                class="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                title="删除此 BPM 节点" @click="removeItemByRawIndex(item.rawIndex)">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </template>

        <!-- 筛选结果为空时 -->
        <div v-else class="py-8 text-center text-slate-400">
          未检索到符合条件的 BPM 节点
        </div>
      </div>

      <!-- 错误提示 -->
      <p v-if="errorMessage" class="text-xs font-medium text-rose-500 px-1">
        {{ errorMessage }}
      </p>

      <!-- 添加节点按钮 -->
      <button type="button"
        class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99]"
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
import { ref, reactive, computed } from 'vue'
import { useAppStore } from '@/store/store'

interface BpmItem {
  Frame: string
  BPM: string
  OriginalBPM: string
}

interface DisplayBpmItem extends BpmItem {
  rawIndex: number
}

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const appStore = useAppStore()

// 全量本地缓存数据
const localList = ref<BpmItem[]>([])
const errorMessage = ref('')

// 排序与筛选状态
const isReversed = ref(false)
const filterForm = reactive({
  minFrame: '',
  maxFrame: '',
  minBpm: '',
  maxBpm: '',
})

// 重置筛选条件
const resetFilter = () => {
  filterForm.minFrame = ''
  filterForm.maxFrame = ''
  filterForm.minBpm = ''
  filterForm.maxBpm = ''
}

// 核心计算属性：处理正/倒序及范围筛选，并映射原始下标以保证同步响应
const displayList = computed<DisplayBpmItem[]>(() => {
  let mappedList: DisplayBpmItem[] = localList.value.map((item, index) => ({
    ...item,
    rawIndex: index,
  }))

  // 1. 范围筛选
  const minF = filterForm.minFrame !== '' ? Number(filterForm.minFrame) : -Infinity
  const maxF = filterForm.maxFrame !== '' ? Number(filterForm.maxFrame) : Infinity
  const minB = filterForm.minBpm !== '' ? Number(filterForm.minBpm) : -Infinity
  const maxB = filterForm.maxBpm !== '' ? Number(filterForm.maxBpm) : Infinity

  mappedList = mappedList.filter((item) => {
    const frameVal = parseFloat(item.Frame) || 0
    const bpmVal = parseFloat(item.BPM) || 0

    return frameVal >= minF && frameVal <= maxF && bpmVal >= minB && bpmVal <= maxB
  })

  // 2. 正序/倒序排列
  if (isReversed.value) {
    mappedList.reverse()
  }

  return mappedList
})

// 1. 初始化数据
const initLocalData = () => {
  errorMessage.value = ''
  resetFilter()
  isReversed.value = false

  const bpmData = appStore.currentSong?.xmlObject?.TITLE?.BPM
  let rawList: BpmItem[] = []

  if (Array.isArray(bpmData)) {
    rawList = bpmData.map((item) => ({
      Frame: String(item.Frame ?? '0'),
      BPM: String(item.BPM ?? '120'),
      OriginalBPM: String(item.OriginalBPM ?? item.BPM ?? '120'),
    }))
  }

  if (rawList.length === 0) {
    rawList = [{ Frame: '0', BPM: '120', OriginalBPM: '120' }]
  }

  rawList[0].Frame = '0'
  localList.value = rawList
}

// 2. 新增 BPM 节点
const addItem = () => {
  errorMessage.value = ''

  const lastItem = localList.value[localList.value.length - 1]
  const nextFrame = lastItem ? String(Number(lastItem.Frame || 0) + 1000) : ''
  const defaultBpm = lastItem?.BPM || '120'

  localList.value.push({
    Frame: nextFrame,
    BPM: defaultBpm,
    OriginalBPM: defaultBpm,
  })
}

// 3. 根据原始下标准确删除节点
const removeItemByRawIndex = (rawIndex: number) => {
  if (rawIndex === 0) return
  errorMessage.value = ''
  localList.value.splice(rawIndex, 1)
}

// 4. 关闭弹窗
const handleClose = (val: boolean) => {
  emit('update:modelValue', val)
}

// 5. 保存与校验 (总是保存全局 localList 数据，同时按升序重新编排写回)
const handleSave = () => {
  errorMessage.value = ''

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

  const formattedList: BpmItem[] = localList.value.map((item, index) => {
    const bpmStr = String(parseFloat(item.BPM))
    return {
      Frame: index === 0 ? '0' : String(parseFloat(item.Frame)),
      BPM: bpmStr,
      OriginalBPM: bpmStr,
    }
  })

  // 写回前统一按 Frame 从小到大升序排序
  const firstItem = formattedList[0]
  const restItems = formattedList.slice(1).sort((a, b) => parseFloat(a.Frame) - parseFloat(b.Frame))
  const sortedResult = [firstItem, ...restItems]

  if (appStore.currentSong?.xmlObject?.TITLE) {
    appStore.currentSong.xmlObject.TITLE.BPM = sortedResult
  }

  handleClose(false)
}
</script>