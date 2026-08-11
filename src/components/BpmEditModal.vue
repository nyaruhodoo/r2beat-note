<template>
  <el-dialog :model-value="modelValue" title="编辑 BPM 列表" width="640px" align-center destroy-on-close
    class="bpm-edit-dialog rounded-2xl" @update:model-value="handleClose" @open="initLocalData">
    <div class="space-y-3">
      <!-- 顶部功能栏：数据统计与操作 -->
      <div class="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
        <span class="font-medium">
          显示 <strong class="font-mono text-slate-900">{{ displayList.length }}</strong> / {{ localList.length }} 个节点
        </span>
        <div class="flex items-center gap-2">
          <!-- 排序切换按钮 -->
          <button type="button"
            class="flex items-center gap-1 rounded bg-white px-2 py-1 text-slate-600 shadow-xs hover:bg-slate-50 transition-colors"
            @click="isReversed = !isReversed">
            <span>{{ isReversed ? '从后往前 (倒序)' : '从前往后 (正序)' }}</span>
            <svg class="h-3.5 w-3.5 transition-transform" :class="{ 'rotate-180': isReversed }" fill="none"
              stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 列表筛选控制区域 -->
      <div class="grid grid-cols-12 gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-2 text-xs">
        <div class="col-span-6 flex items-center gap-1.5">
          <span class="text-slate-400 font-medium shrink-0">Frame 筛选:</span>
          <input v-model="filterForm.minFrame" type="number" placeholder="Min"
            class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-slate-700 focus:border-slate-500 focus:outline-none" />
          <span class="text-slate-300">-</span>
          <input v-model="filterForm.maxFrame" type="number" placeholder="Max"
            class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-slate-700 focus:border-slate-500 focus:outline-none" />
        </div>

        <div class="col-span-5 flex items-center gap-1.5">
          <span class="text-slate-400 font-medium shrink-0">BPM 筛选:</span>
          <input v-model="filterForm.minBpm" type="number" placeholder="Min"
            class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-slate-700 focus:border-slate-500 focus:outline-none" />
          <span class="text-slate-300">-</span>
          <input v-model="filterForm.maxBpm" type="number" placeholder="Max"
            class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-slate-700 focus:border-slate-500 focus:outline-none" />
        </div>

        <div class="col-span-1 flex items-center justify-end">
          <button type="button" class="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            @click="resetFilter">
            重置
          </button>
        </div>
      </div>

      <!-- 渐变生成配置面板 -->
      <div v-if="showRampPanel"
        class="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs space-y-3 transition-all">
        <div
          class="flex items-center justify-between font-semibold text-indigo-900 border-b border-indigo-100/60 pb-1.5">
          <span class="flex items-center gap-1">
            <svg class="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            批量 BPM 渐变配置
          </span>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="toggleRampPanel(false)">✕</button>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="block font-medium text-slate-500">Frame 范围 & 采样密度</label>
            <div class="flex items-center gap-1.5">
              <input v-model="rampForm.startFrame" type="number" placeholder="起始 Frame"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono" />
              <span class="text-slate-300">→</span>
              <input v-model="rampForm.endFrame" type="number" placeholder="结束 Frame"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono" />
            </div>
            <div class="flex items-center gap-2 pt-1">
              <span class="text-slate-400">步长(Frame/点):</span>
              <input v-model="rampForm.step" type="number" min="1" placeholder="如 100"
                class="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono" />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="block font-medium text-slate-500">BPM 范围 & 曲线变化</label>
            <div class="flex items-center gap-1.5">
              <input v-model="rampForm.startBpm" type="number" placeholder="起始 BPM"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono" />
              <span class="text-slate-300">→</span>
              <input v-model="rampForm.endBpm" type="number" placeholder="结束 BPM"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono" />
            </div>
            <div class="flex items-center gap-2 pt-1">
              <span class="text-slate-400 shrink-0">缓动类型:</span>
              <select v-model="rampForm.easing" class="w-full rounded-md border border-slate-200 bg-white px-2 py-1">
                <option value="linear">Linear (线性)</option>
                <option value="easeIn">Ease In (0.42, 0, 1, 1)</option>
                <option value="easeOut">Ease Out (0, 0, 0.58, 1)</option>
                <option value="easeInOut">Ease In Out (0.42, 0, 0.58, 1)</option>
                <option value="custom">Custom (贝塞尔 cubic-bezier)</option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="rampForm.easing === 'custom'" class="space-y-1 rounded-lg border border-indigo-200/60 bg-white p-2">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-medium text-indigo-900">贝塞尔控制点:</span>
            <span class="text-slate-400">例: cubic-bezier(0.25, 0.10, 0.25, 1.00)</span>
          </div>
          <input v-model="rampForm.customBezier" type="text" placeholder="例: cubic-bezier(0.25, 0.10, 0.25, 1.00)"
            class="w-full rounded-md border border-slate-200 px-2.5 py-1 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:outline-none" />
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <button type="button"
            class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all"
            @click="generateRampNodes">
            生成并插入节点
          </button>
        </div>
      </div>

      <!-- 批量删除配置面板 -->
      <div v-if="showDeletePanel"
        class="rounded-xl border border-rose-100 bg-rose-50/40 p-3 text-xs space-y-3 transition-all">
        <div class="flex items-center justify-between font-semibold text-rose-900 border-b border-rose-100/60 pb-1.5">
          <span class="flex items-center gap-1">
            <svg class="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            指定区间批量删除
          </span>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="toggleDeletePanel(false)">✕</button>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <!-- Frame 删除范围 -->
          <div class="space-y-1">
            <label class="block font-medium text-slate-600">Frame 删除区间</label>
            <div class="flex items-center gap-1.5">
              <input v-model="deleteForm.minFrame" type="number" placeholder="最小 Frame"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono" />
              <span class="text-slate-300">-</span>
              <input v-model="deleteForm.maxFrame" type="number" placeholder="最大 Frame"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono" />
            </div>
          </div>

          <!-- BPM 删除范围 -->
          <div class="space-y-1">
            <label class="block font-medium text-slate-600">BPM 删除区间 (可选)</label>
            <div class="flex items-center gap-1.5">
              <input v-model="deleteForm.minBpm" type="number" placeholder="最小 BPM"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono" />
              <span class="text-slate-300">-</span>
              <input v-model="deleteForm.maxBpm" type="number" placeholder="最大 BPM"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono" />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-1">
          <span class="text-slate-500 font-medium">
            受影响节点: <strong class="text-rose-600 font-mono">{{ pendingDeleteCount }}</strong> 个 (首个固定节点会被保留)
          </span>
          <button type="button" :disabled="pendingDeleteCount === 0"
            class="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-40 disabled:hover:bg-rose-600 disabled:cursor-not-allowed"
            @click="executeBatchDelete">
            确认批量删除
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

      <!-- BPM 节点列表 -->
      <div class="max-h-[300px] min-h-[180px] overflow-y-auto space-y-1.5 pr-1 text-xs">
        <template v-if="displayList.length > 0">
          <div v-for="item in displayList" :key="item.rawIndex"
            class="grid grid-cols-12 gap-2 items-center rounded-lg border border-slate-100 bg-slate-50/50 p-1.5 transition-all hover:border-slate-200 hover:bg-slate-50">
            <div class="col-span-2 pl-1 font-mono text-slate-400 font-medium">
              #{{ item.rawIndex + 1 }}
            </div>

            <div class="col-span-4">
              <input v-model="item.Frame" type="number" min="0" step="1" :disabled="item.rawIndex === 0"
                :placeholder="item.rawIndex === 0 ? '0 (固定)' : 'Frame'"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-700 transition-all focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>

            <div class="col-span-4">
              <input v-model="item.BPM" type="number" min="1" step="0.01" placeholder="BPM"
                class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-700 transition-all focus:border-slate-500 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>

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

        <div v-else class="py-8 text-center text-slate-400">
          未检索到符合条件的 BPM 节点
        </div>
      </div>

      <!-- 错误提示 -->
      <p v-if="errorMessage" class="text-xs font-medium text-rose-500 px-1">
        {{ errorMessage }}
      </p>

      <!-- 底部添加操作栏 -->
      <div class="grid grid-cols-3 gap-2">
        <button type="button"
          class="flex items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-600 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99] transition-all"
          @click="addItem">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          单点添加
        </button>

        <button type="button"
          class="flex items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50/50 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100/50 active:scale-[0.99] transition-all"
          @click="toggleRampPanel(!showRampPanel)">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          批量渐变 (Ramp)
        </button>

        <button type="button"
          class="flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50/50 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100/50 active:scale-[0.99] transition-all"
          @click="toggleDeletePanel(!showDeletePanel)">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          批量删除区间
        </button>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2 pt-2">
        <button type="button"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          @click="handleClose(false)">
          取消
        </button>
        <button type="button"
          class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 active:scale-95 transition-all"
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

const localList = ref<BpmItem[]>([])
const errorMessage = ref('')
const isReversed = ref(false)
const showRampPanel = ref(false)
const showDeletePanel = ref(false)

// 列表筛选表单
const filterForm = reactive({
  minFrame: '',
  maxFrame: '',
  minBpm: '',
  maxBpm: '',
})

// 渐变生成表单
const initialRampForm = {
  startFrame: '',
  endFrame: '',
  startBpm: '',
  endBpm: '',
  step: '100',
  easing: 'linear' as 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'custom',
  customBezier: 'cubic-bezier(0.25, 0.10, 0.25, 1.00)',
}
const rampForm = reactive({ ...initialRampForm })

// 批量删除表单
const initialDeleteForm = {
  minFrame: '',
  maxFrame: '',
  minBpm: '',
  maxBpm: '',
}
const deleteForm = reactive({ ...initialDeleteForm })

// 重置渐变配置
const resetRampForm = () => {
  Object.assign(rampForm, initialRampForm)
}

// 重置批量删除配置
const resetDeleteForm = () => {
  Object.assign(deleteForm, initialDeleteForm)
}

// 展开/关闭渐变面板
const toggleRampPanel = (visible: boolean) => {
  showRampPanel.value = visible
  if (visible) showDeletePanel.value = false // 互斥展开
  else resetRampForm()
}

// 展开/关闭删除面板
const toggleDeletePanel = (visible: boolean) => {
  showDeletePanel.value = visible
  if (visible) showRampPanel.value = false // 互斥展开
  else resetDeleteForm()
}

// 实时计算将被批量删除的节点数量 (排除原始第 0 项)
const pendingDeleteCount = computed(() => {
  const minF = deleteForm.minFrame !== '' ? Number(deleteForm.minFrame) : -Infinity
  const maxF = deleteForm.maxFrame !== '' ? Number(deleteForm.maxFrame) : Infinity
  const minB = deleteForm.minBpm !== '' ? Number(deleteForm.minBpm) : -Infinity
  const maxB = deleteForm.maxBpm !== '' ? Number(deleteForm.maxBpm) : Infinity

  if (minF === -Infinity && maxF === Infinity && minB === -Infinity && maxB === Infinity) {
    return 0 // 未输入任何条件时不执行全删，保障安全
  }

  return localList.value.filter((item, index) => {
    if (index === 0) return false // 不包含第一项
    const frameVal = parseFloat(item.Frame) || 0
    const bpmVal = parseFloat(item.BPM) || 0
    return frameVal >= minF && frameVal <= maxF && bpmVal >= minB && bpmVal <= maxB
  }).length
})

// 执行批量删除
const executeBatchDelete = () => {
  errorMessage.value = ''
  const minF = deleteForm.minFrame !== '' ? Number(deleteForm.minFrame) : -Infinity
  const maxF = deleteForm.maxFrame !== '' ? Number(deleteForm.maxFrame) : Infinity
  const minB = deleteForm.minBpm !== '' ? Number(deleteForm.minBpm) : -Infinity
  const maxB = deleteForm.maxBpm !== '' ? Number(deleteForm.maxBpm) : Infinity

  localList.value = localList.value.filter((item, index) => {
    if (index === 0) return true // 绝对保护首节点
    const frameVal = parseFloat(item.Frame) || 0
    const bpmVal = parseFloat(item.BPM) || 0
    const isTarget = frameVal >= minF && frameVal <= maxF && bpmVal >= minB && bpmVal <= maxB
    return !isTarget
  })

  // 成功后关闭面板并清空数据
  toggleDeletePanel(false)
}

// 三阶贝塞尔曲线算法
const cubicBezier = (mX1: number, mY1: number, mX2: number, mY2: number) => {
  if (mX1 === mY1 && mX2 === mY2) return (t: number) => t

  const A = (aA1: number, aA2: number) => 1.0 - 3.0 * aA2 + 3.0 * aA1
  const B = (aA1: number, aA2: number) => 3.0 * aA2 - 6.0 * aA1
  const C = (aA1: number) => 3.0 * aA1

  const calcBezier = (aT: number, aA1: number, aA2: number) =>
    ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT

  const getSlope = (aT: number, aA1: number, aA2: number) =>
    3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1)

  const solveCurveX = (aX: number) => {
    let t = aX
    for (let i = 0; i < 8; i++) {
      const currentX = calcBezier(t, mX1, mX2) - aX
      const currentSlope = getSlope(t, mX1, mX2)
      if (Math.abs(currentX) < 1e-6 || currentSlope === 0) break
      t -= currentX / currentSlope
    }
    let intervalStart = 0.0
    let intervalEnd = 1.0
    t = aX
    while (intervalStart < intervalEnd) {
      const currentX = calcBezier(t, mX1, mX2)
      if (Math.abs(currentX - aX) < 1e-6) break
      if (aX > currentX) intervalStart = t
      else intervalEnd = t
      t = (intervalEnd - intervalStart) * 0.5 + intervalStart
    }
    return t
  }

  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    return calcBezier(solveCurveX(x), mY1, mY2)
  }
}

const presetBeziers: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
}

const parseBezierString = (str: string): [number, number, number, number] | null => {
  if (!str) return null
  const matches = str.match(/-?\d+(\.\d+)?/g)
  if (matches && matches.length >= 4) {
    const nums = matches.slice(0, 4).map(Number)
    if (nums.every((n) => !isNaN(n))) return nums as [number, number, number, number]
  }
  return null
}

const getEasingFunction = (): ((t: number) => number) | null => {
  if (rampForm.easing !== 'custom') {
    const [x1, y1, x2, y2] = presetBeziers[rampForm.easing]
    return cubicBezier(x1, y1, x2, y2)
  }

  const bezierParams = parseBezierString(rampForm.customBezier)
  if (!bezierParams) return null

  const [x1, y1, x2, y2] = bezierParams
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null

  return cubicBezier(x1, y1, x2, y2)
}

// 批量生成渐变 BPM 节点
const generateRampNodes = () => {
  errorMessage.value = ''
  const startF = parseFloat(rampForm.startFrame)
  const endF = parseFloat(rampForm.endFrame)
  const startB = parseFloat(rampForm.startBpm)
  const endB = parseFloat(rampForm.endBpm)
  const stepF = parseFloat(rampForm.step)

  if (isNaN(startF) || isNaN(endF) || startF >= endF) {
    errorMessage.value = '渐变生成失败：请输入有效的起始和结束 Frame（结束需大于起始）'
    return
  }
  if (isNaN(startB) || isNaN(endB) || startB <= 0 || endB <= 0) {
    errorMessage.value = '渐变生成失败：请输入大于 0 的有效 BPM'
    return
  }
  if (isNaN(stepF) || stepF <= 0) {
    errorMessage.value = '渐变生成失败：步长必须为大于 0 的数字'
    return
  }

  const easeFn = getEasingFunction()
  if (!easeFn) {
    errorMessage.value = '贝塞尔格式错误！示例: cubic-bezier(0.25, 0.1, 0.25, 1)'
    return
  }

  const totalFrameDiff = endF - startF
  const totalBpmDiff = endB - startB
  const newNodes: BpmItem[] = []

  for (let currentF = startF; currentF <= endF; currentF += stepF) {
    const t = (currentF - startF) / totalFrameDiff
    const progress = easeFn(Math.min(Math.max(t, 0), 1))
    const currentBpm = startB + totalBpmDiff * progress

    newNodes.push({
      Frame: String(Math.round(currentF)),
      BPM: String(Number(currentBpm.toFixed(2))),
      OriginalBPM: String(Number(currentBpm.toFixed(2))),
    })
  }

  const lastGenerated = newNodes[newNodes.length - 1]
  if (!lastGenerated || Number(lastGenerated.Frame) !== endF) {
    newNodes.push({
      Frame: String(Math.round(endF)),
      BPM: String(Number(endB.toFixed(2))),
      OriginalBPM: String(Number(endB.toFixed(2))),
    })
  }

  localList.value = [...localList.value, ...newNodes]
  sortAndDedupLocalList()

  toggleRampPanel(false)
}

const sortAndDedupLocalList = () => {
  const first = localList.value[0] || { Frame: '0', BPM: '120', OriginalBPM: '120' }
  first.Frame = '0'

  const rest = localList.value.slice(1).sort((a, b) => (parseFloat(a.Frame) || 0) - (parseFloat(b.Frame) || 0))
  localList.value = [first, ...rest]
}

const resetFilter = () => {
  filterForm.minFrame = ''
  filterForm.maxFrame = ''
  filterForm.minBpm = ''
  filterForm.maxBpm = ''
}

const displayList = computed<DisplayBpmItem[]>(() => {
  let mappedList: DisplayBpmItem[] = localList.value.map((item, index) => ({
    ...item,
    rawIndex: index,
  }))

  const minF = filterForm.minFrame !== '' ? Number(filterForm.minFrame) : -Infinity
  const maxF = filterForm.maxFrame !== '' ? Number(filterForm.maxFrame) : Infinity
  const minB = filterForm.minBpm !== '' ? Number(filterForm.minBpm) : -Infinity
  const maxB = filterForm.maxBpm !== '' ? Number(filterForm.maxBpm) : Infinity

  mappedList = mappedList.filter((item) => {
    const frameVal = parseFloat(item.Frame) || 0
    const bpmVal = parseFloat(item.BPM) || 0
    return frameVal >= minF && frameVal <= maxF && bpmVal >= minB && bpmVal <= maxB
  })

  if (isReversed.value) {
    mappedList.reverse()
  }

  return mappedList
})

const initLocalData = () => {
  errorMessage.value = ''
  resetFilter()
  isReversed.value = false
  toggleRampPanel(false)
  toggleDeletePanel(false)

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

const removeItemByRawIndex = (rawIndex: number) => {
  if (rawIndex === 0) return
  errorMessage.value = ''
  localList.value.splice(rawIndex, 1)
}

const handleClose = (val: boolean) => {
  emit('update:modelValue', val)
}

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

  const firstItem = formattedList[0]
  const restItems = formattedList.slice(1).sort((a, b) => parseFloat(a.Frame) - parseFloat(b.Frame))
  const sortedResult = [firstItem, ...restItems]

  if (appStore.currentSong?.xmlObject?.TITLE) {
    appStore.currentSong.xmlObject.TITLE.BPM = sortedResult
  }

  handleClose(false)
}
</script>