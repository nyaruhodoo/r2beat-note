<template>
  <div
    class="mobile-action-panel relative box-border flex w-full max-w-[100vw] flex-col gap-1 overflow-hidden px-1.5 pt-1 pb-4 font-sans text-xs text-gray-200 select-none"
    :style="{ backgroundColor: cssCanvasBgColor }"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @touchmove="onTouchMove"
  >
    <!-- 顶部脱离分页的 Slider 滑块（用于控制 Coord 精度） -->
    <div class="flex items-center gap-2 px-2 py-0.5">
      <span class="text-[10px] whitespace-nowrap text-gray-400">精度: {{ stepCoordSafe }}</span>
      <el-slider
        v-model="stepCoordSafe"
        :min="1"
        :max="12"
        :step="1"
        show-stops
        :show-tooltip="false"
        size="small"
        class="mobile-coord-slider flex-1"
      />
    </div>

    <!-- 1. 内容面板（多页轮播/滑动，外层裁剪防止露边） -->
    <div class="w-full max-w-[100vw] overflow-hidden">
      <div
        class="flex w-full transition-transform duration-300 ease-in-out"
        :style="{ transform: `translateX(-${currentPage * 100}%)` }"
      >
        <!-- 第一页：切换播放 / 触屏模式 / 时间微调 / 节拍 / 速率 / 核心操作 -->
        <div class="box-border flex w-full shrink-0 flex-col gap-1 px-0.5">
          <!-- 切换播放与触屏模式：同一行各占 50% -->
          <div class="grid grid-cols-2 gap-1">
            <el-button
              type="primary"
              class="m-0! h-7! rounded-md! px-2! text-xs font-medium active:scale-95"
              @click.stop="emitEvent('toggle-play')"
            >
              <el-icon class="mr-1 text-sm"><VideoPlay /></el-icon>
              切换播放
            </el-button>

            <el-button
              :type="touchMode === 'add' ? 'success' : 'warning'"
              plain
              class="m-0! h-7! rounded-md! px-2! text-xs font-medium active:scale-95"
              @click.stop="toggleTouchMode"
            >
              <el-icon class="mr-1 text-sm"><Pointer /></el-icon>
              {{ touchMode === 'add' ? '触屏:放置' : '触屏:清空' }}
            </el-button>
          </div>

          <!-- 时间微调 -->
          <div class="grid grid-cols-4 gap-1">
            <el-button
              class="m-0! h-7! rounded-md! px-1! text-xs active:scale-95"
              @click.stop="seekByOffset(-3)"
            >
              <el-icon class="mr-0.5"><DArrowLeft /></el-icon>-3s
            </el-button>
            <el-button
              class="m-0! h-7! rounded-md! px-1! text-xs active:scale-95"
              @click.stop="emitEvent('step-backward')"
            >
              <el-icon class="mr-0.5"><ArrowLeft /></el-icon>微退
            </el-button>
            <el-button
              class="m-0! h-7! rounded-md! px-1! text-xs active:scale-95"
              @click.stop="emitEvent('step-forward')"
            >
              微进<el-icon class="ml-0.5"><ArrowRight /></el-icon>
            </el-button>
            <el-button
              class="m-0! h-7! rounded-md! px-1! text-xs active:scale-95"
              @click.stop="seekByOffset(3)"
            >
              +3s<el-icon class="ml-0.5"><DArrowRight /></el-icon>
            </el-button>
          </div>

          <!-- 节拍控制 -->
          <div class="grid grid-cols-3 gap-1">
            <el-button
              class="m-0! h-7! rounded-md! px-1! text-xs active:scale-95"
              @click.stop="emitEvent('decrease-beat')"
              >减少节拍</el-button
            >
            <el-button
              class="m-0! h-7! rounded-md! px-1! text-xs active:scale-95"
              @click.stop="emitEvent('reset-beat')"
              >重置节拍</el-button
            >
            <el-button
              class="m-0! h-7! rounded-md! px-1! text-xs active:scale-95"
              @click.stop="emitEvent('increase-beat')"
              >增加节拍</el-button
            >
          </div>

          <!-- 速率控制 -->
          <div class="grid grid-cols-3 gap-1">
            <el-button
              class="m-0! h-7! rounded-md! px-1! text-xs active:scale-95"
              @click.stop="emitEvent('decrease-speed')"
              >减少速率</el-button
            >
            <el-button
              class="m-0! h-7! rounded-md! px-1! text-xs active:scale-95"
              @click.stop="emitEvent('reset-speed')"
              >重置速率</el-button
            >
            <el-button
              class="m-0! h-7! rounded-md! px-1! text-xs active:scale-95"
              @click.stop="emitEvent('increase-speed')"
              >增加速率</el-button
            >
          </div>

          <!-- 核心操作区：放置与清空 -->
          <div class="grid grid-cols-2 gap-1">
            <el-button
              type="success"
              class="m-0! h-7! rounded-md! px-2! text-xs font-semibold active:scale-95"
              @click.stop="emitEvent('place-obstacle')"
            >
              <el-icon class="mr-1 text-sm"><Plus /></el-icon>放置
            </el-button>
            <el-button
              type="danger"
              class="m-0! h-7! rounded-md! px-2! text-xs font-semibold active:scale-95"
              @click.stop="emitEvent('clear-obstacle')"
            >
              <el-icon class="mr-1 text-sm"><Delete /></el-icon>清空
            </el-button>
          </div>
        </div>

        <!-- 第二页：放置/清空、撤回/恢复、刻度显示 -->
        <div class="box-border flex w-full shrink-0 flex-col gap-1 px-0.5">
          <!-- 编辑历史：撤回与恢复 -->
          <div class="grid grid-cols-2 gap-1">
            <el-button
              class="m-0! h-7! rounded-md! px-2! text-xs active:scale-95"
              @click.stop="emitEvent('undo')"
            >
              <el-icon class="mr-1 text-sm"><RefreshLeft /></el-icon>撤回
            </el-button>
            <el-button
              class="m-0! h-7! rounded-md! px-2! text-xs active:scale-95"
              @click.stop="emitEvent('redo')"
            >
              <el-icon class="mr-1 text-sm"><RefreshRight /></el-icon>恢复
            </el-button>
          </div>

          <!-- 底部次要控制：刻度显示 -->
          <div class="grid grid-cols-1 gap-1">
            <el-button
              class="m-0! h-7! rounded-md! px-2! text-xs active:scale-95"
              @click.stop="emitEvent('toggle-scale')"
            >
              <el-icon class="mr-1 text-sm"><ScaleToOriginal /></el-icon>
              刻度显示
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 分页指示器（自动基于总页数动态渲染） -->
    <div
      class="pointer-events-none absolute inset-x-0 bottom-1 flex items-center justify-center gap-1"
    >
      <span
        v-for="(_, index) in totalPages"
        :key="index"
        class="pointer-events-auto h-1 cursor-pointer rounded-full transition-all duration-300"
        :class="currentPage === index ? 'bg-primary w-3.5' : 'w-1 bg-gray-600'"
        @click="currentPage = index"
      ></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  VideoPlay,
  ScaleToOriginal,
  ArrowLeft,
  ArrowRight,
  DArrowLeft,
  DArrowRight,
  RefreshLeft,
  RefreshRight,
  Plus,
  Delete,
  Pointer,
} from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { ref, computed } from 'vue'

import { useGlobalConfigStore } from '@/store/global-config'
import { useAppStore } from '@/store/store'
import { emitter, type ShortcutEvents } from '@/utils/eventBus'
import { toCssHex8 } from '@/utils/utils'

const appStore = useAppStore()
const globalConfigStore = useGlobalConfigStore()
const { currentSongInfo, touchMode } = storeToRefs(appStore)

// 定义总页数（如果后续需要扩展第三页，只需在此处修改或改为由子项数组长度决定）
const totalPages = ref<number>(2)

// 当前页码 (从 0 开始)
const currentPage = ref<number>(0)

// 背景色直接沿用 canvasBgColor 样式
const cssCanvasBgColor = computed(() => {
  return toCssHex8(globalConfigStore.canvasBgColor)
})

// 安全地对全局配置中的 Coord 精度 (stepCoord) 进行计算属性双向绑定
const stepCoordSafe = computed<number>({
  get: () => {
    const val = globalConfigStore.stepCoord
    return typeof val === 'number' && !Number.isNaN(val) ? val : 1
  },
  set: (val: number) => {
    if (val !== undefined && val !== null && !Number.isNaN(val)) {
      globalConfigStore.stepCoord = Math.min(Math.max(val, 0.1), 100)
    }
  },
})

// 触屏滑动与鼠标拖拽支持
let touchStartX = 0
let touchEndX = 0
let mouseStartX = 0

const onTouchStart = (e: TouchEvent) => {
  touchStartX = e.changedTouches[0].screenX
}

// 关键：拦截 touchmove，防止触发浏览器左右边缘返回/前进手势
const onTouchMove = (e: TouchEvent) => {
  e.preventDefault()
}

const onTouchEnd = (e: TouchEvent) => {
  touchEndX = e.changedTouches[0].screenX
  handleSwipe()
}

const onMouseDown = (e: MouseEvent) => {
  mouseStartX = e.clientX
}

const onMouseUp = (e: MouseEvent) => {
  const mouseEndX = e.clientX
  const diff = mouseEndX - mouseStartX
  if (Math.abs(diff) > 50) {
    if (diff > 0 && currentPage.value > 0) {
      currentPage.value--
    } else if (diff < 0 && currentPage.value < totalPages.value - 1) {
      currentPage.value++
    }
  }
}

const handleSwipe = () => {
  const diff = touchEndX - touchStartX
  const threshold = 40 // 滑动触发阈值
  if (Math.abs(diff) > threshold) {
    if (diff > 0 && currentPage.value > 0) {
      currentPage.value-- // 向右滑动，上一页
    } else if (diff < 0 && currentPage.value < totalPages.value - 1) {
      currentPage.value++ // 向左滑动，下一页
    }
  }
}

// 切换触屏模式 (add <-> delete)
const toggleTouchMode = () => {
  touchMode.value = touchMode.value === 'add' ? 'delete' : 'add'
}

// 时间前进 / 后退 offset 秒
const seekByOffset = (offset: number) => {
  const currentTime = currentSongInfo.value?.currentTime ?? 0
  const targetTime = Math.max(0, currentTime + offset)
  emitter.emit('seekTo', { target: targetTime, type: 'time' })
}

// 统一的事件派发方法
const emitEvent = (eventName: ShortcutEvents, payLoad?: unknown) => {
  console.log(`[移动端控件触发] 事件: ${eventName}`)
  emitter.emit(eventName, payLoad)
}
</script>

<style scoped>
.mobile-action-panel :deep(.el-button) {
  margin-left: 0 !important;
  background-color: #1f2937; /* gray-800 */
  border-color: #374151; /* gray-700 */
  color: #e5e7eb; /* gray-200 */
}

.mobile-action-panel :deep(.el-button:hover) {
  background-color: #374151; /* gray-700 */
  border-color: #4b5563; /* gray-600 */
  color: #ffffff;
}

/* 其它预设类型按钮颜色维持高亮与辨识度 */
.mobile-action-panel :deep(.el-button--primary) {
  background-color: var(--el-color-primary) !important;
  border-color: var(--el-color-primary) !important;
  color: #ffffff !important;
}

.mobile-action-panel :deep(.el-button--success) {
  background-color: var(--el-color-success) !important;
  border-color: var(--el-color-success) !important;
  color: #ffffff !important;
}

.mobile-action-panel :deep(.el-button--warning) {
  background-color: var(--el-color-warning) !important;
  border-color: var(--el-color-warning) !important;
  color: #ffffff !important;
}

.mobile-action-panel :deep(.el-button--danger) {
  background-color: var(--el-color-danger) !important;
  border-color: var(--el-color-danger) !important;
  color: #ffffff !important;
}

/* 优化顶部 Coord 精度滑块在移动端的紧凑度与暗色适配 */
.mobile-coord-slider :deep(.el-slider__runway) {
  margin: 4px 0 !important;
  height: 4px;
  background-color: #374151 !important; /* gray-700 */
}

.mobile-coord-slider :deep(.el-slider__bar) {
  background-color: var(--el-color-primary) !important;
}

.mobile-coord-slider :deep(.el-slider__button) {
  width: 12px;
  height: 12px;
  background-color: #e5e7eb;
  border-color: var(--el-color-primary);
}

.mobile-coord-slider :deep(.el-slider__stop) {
  background-color: #4b5563 !important;
}
</style>
