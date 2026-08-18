<template>
  <!-- 最外层包裹 Transition 动画，实现纯粹的透明度淡入淡出 -->
  <Transition
    enter-active-class="transition-opacity duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-100 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div class="mt-auto shrink-0 border-t border-slate-100 bg-white pt-3">
      <!-- 头部：状态展示 -->
      <div class="mb-2.5 flex items-center justify-between px-1">
        <div class="flex items-center gap-1.5">
          <span class="relative flex h-2 w-2">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"
            ></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
          </span>
          <span class="text-xs font-medium text-slate-500">已选中</span>
          <span class="text-xs font-bold text-slate-800">{{ selectedCoords.size }}</span>
          <span class="text-[11px] text-slate-400">项</span>
          <span class="text-xs font-medium text-slate-500">共</span>
          <span class="text-xs font-bold text-slate-800">{{ obstacles.length }}</span>
          <span class="text-[11px] text-slate-400">项</span>
        </div>

        <!-- 右侧操作组 -->
        <div class="flex items-center gap-2">
          <button
            @click="handleSelectAll"
            class="text-[11px] font-medium text-slate-400 transition-colors hover:text-indigo-600"
          >
            全选
          </button>
          <span class="text-[10px] text-slate-200">|</span>
          <button
            @click="handleClearSelection"
            class="text-[11px] font-medium text-slate-400 transition-colors hover:text-rose-500"
          >
            清空已选
          </button>
        </div>
      </div>

      <!-- 多按钮矩阵与气泡弹出框容器 -->
      <div class="relative grid grid-cols-3 gap-1.5">
        <!-- 点击气泡框外部遮罩关闭Popover -->
        <div v-if="activePopover" class="fixed inset-0 z-10" @click="activePopover = null"></div>

        <!-- 1. 对齐/平移障碍 气泡弹出框 -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-1 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-1 scale-95"
        >
          <div
            v-if="activePopover === 'align'"
            class="absolute right-0 bottom-full left-0 z-20 mb-2 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xl ring-1 ring-black/5"
          >
            <div class="mb-1.5 flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700">对齐/偏移 Coord</span>
              <button
                @click="activePopover = null"
                class="px-1 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p class="mb-2 text-[11px] text-slate-400">平移选中障碍物，新位置已有障碍物将被覆盖</p>
            <div class="flex items-center gap-1.5">
              <input
                ref="alignInputRef"
                type="number"
                v-model.number="alignOffset"
                placeholder="偏移量 (+/-)"
                class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                @click="handleAlignSubmit"
                class="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
              >
                应用
              </button>
            </div>
          </div>
        </Transition>

        <!-- 2. 复制副本 气泡弹出框 -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-1 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-1 scale-95"
        >
          <div
            v-if="activePopover === 'duplicate'"
            class="absolute right-0 bottom-full left-0 z-20 mb-2 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xl ring-1 ring-black/5"
          >
            <div class="mb-1.5 flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700">复制副本到下一个基准 Coord</span>
              <button
                @click="activePopover = null"
                class="px-1 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p class="mb-2 text-[11px] text-slate-400">将清空目标区间内的旧障碍物再进行填充</p>
            <div class="flex items-center gap-1.5">
              <input
                ref="duplicateInputRef"
                type="number"
                min="0"
                v-model.number="duplicateBaseCoord"
                placeholder="基准 Coord (≥0)"
                class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                @click="handleDuplicateSubmit"
                class="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
              >
                复制
              </button>
            </div>
          </div>
        </Transition>

        <!-- 操作按钮渲染 -->
        <button
          v-for="btn in actionButtons"
          :disabled="selectedCoords.size === 0"
          :key="btn.id"
          @click="btn.action"
          :class="
            twMerge(
              'flex items-center justify-center rounded-lg bg-slate-100 px-2 py-2 text-xs font-medium text-slate-600 transition-all hover:bg-slate-200/80 hover:text-slate-900 active:scale-95 active:bg-slate-200 disabled:pointer-events-none disabled:opacity-40',
              btn.customClass,
            )
          "
        >
          {{ btn.label }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'
import { twMerge } from 'tailwind-merge'
import { ref, computed, nextTick } from 'vue'

import { mirrorModeMap, NoteType, StarNotetransformMap } from '@/note'
import { useGlobalConfigStore } from '@/store/global-config'
import { useAppStore, type NoteData } from '@/store/store'

const store = useAppStore()
const globalConfigStore = useGlobalConfigStore()
const { stepCoord } = storeToRefs(globalConfigStore)
const { selectedCoords, currentSong } = storeToRefs(store)

const activePopover = ref<'align' | 'duplicate' | null>(null)
const alignOffset = ref<number>(0)
const duplicateBaseCoord = ref<number>(0)

const alignInputRef = ref<HTMLInputElement | null>(null)
const duplicateInputRef = ref<HTMLInputElement | null>(null)

const obstacles = computed(() => {
  const areaData = currentSong.value?.xmlObject?.TITLE?.AREA
  if (!areaData) return []
  return areaData
})

function handleSelectAll() {
  const newSet = new Set(obstacles.value.map((obs) => +obs.Coord))
  selectedCoords.value = newSet
}

function handleClearSelection() {
  selectedCoords.value.clear()
}

/**
 * 双指针获取已选障碍物
 */
function getSelectedObstacles(): NoteData[] {
  const coordsList = Array.from(selectedCoords.value).sort((a, b) => a - b)
  const obs = obstacles.value
  const result: NoteData[] = []

  let i = 0
  let j = 0

  while (i < coordsList.length && j < obs.length) {
    const targetCoord = coordsList[i]
    const currentCoord = +obs[j].Coord

    if (currentCoord === targetCoord) {
      result.push(obs[j])
      i++
      j++
    } else if (currentCoord < targetCoord) {
      j++
    } else {
      i++
    }
  }

  return result
}

/**
 * 抽取公共校验函数：长音完整性校验
 * @param selectedObs 选中的障碍物列表（必须已按 Coord 升序排列）
 * @returns boolean 校验是否通过
 */
function validateSelection(selectedObs: NoteData[]): boolean {
  if (selectedObs.length === 0) return false

  const firstObs = selectedObs[0]
  const lastObs = selectedObs[selectedObs.length - 1]

  const firstKind = String(firstObs.Kind)
  const lastKind = String(lastObs.Kind)

  // 定义校验用的音符 Kind 集合
  const middleKinds = new Set(['129', '132', '135', '138', '141', '144'])
  const headKinds = new Set(['130', '133', '136', '139', '142', '145'])
  const tailKinds = new Set(['128', '131', '134', '137', '140', '143'])

  // 规则 1：首尾障碍物不能是长音的中间帧
  if (middleKinds.has(firstKind) || middleKinds.has(lastKind)) {
    ElMessage.error('操作失败：首尾障碍物不能包含长音中间帧')
    return false
  }

  // 规则 2：第一个障碍物不能是长音尾帧
  if (headKinds.has(firstKind)) {
    ElMessage.error('操作失败：第一个障碍物不能是长音尾帧')
    return false
  }

  // 规则 3：最后一个障碍物不能是长音首帧
  if (tailKinds.has(lastKind)) {
    ElMessage.error('操作失败：最后一个障碍物不能是长音首帧')
    return false
  }

  return true
}

/**
 * 批量删除
 */
function handleBatchDelete() {
  if (!currentSong.value?.xmlObject?.TITLE?.AREA || selectedCoords.value.size === 0) return

  const selectedSet = selectedCoords.value
  const plainArea = currentSong.value.xmlObject.TITLE.AREA.filter(
    (item: NoteData) => !selectedSet.has(+item.Coord),
  )

  currentSong.value.xmlObject.TITLE.AREA = plainArea
  handleClearSelection()
}

/**
 * 功能 1：对齐/偏移障碍物 (自动碰撞检测与覆盖)
 */
function handleAlignSubmit() {
  const area = currentSong.value?.xmlObject?.TITLE?.AREA
  if (!area || selectedCoords.value.size === 0) return

  const selectedObs = getSelectedObstacles()
  // 校验逻辑
  if (!validateSelection(selectedObs)) return

  const offset = Number(alignOffset.value) || 0
  if (offset === 0) {
    activePopover.value = null
    return
  }

  const selectedSet = selectedCoords.value
  const movedMap = new Map<number, NoteData>()
  const newSelectedCoords = new Set<number>()

  selectedObs.forEach((note) => {
    const newCoord = Math.max(0, +note.Coord + offset)
    movedMap.set(newCoord, { ...note, Coord: String(newCoord) })
    newSelectedCoords.add(newCoord)
  })

  const plainArea = (area as NoteData[]).filter((item: NoteData) => {
    const coord = +item.Coord
    if (selectedSet.has(coord)) return false
    if (movedMap.has(coord)) return false
    return true
  })

  plainArea.push(...Array.from(movedMap.values()))
  plainArea.sort((a, b) => +a.Coord - +b.Coord)

  if (currentSong.value?.xmlObject.TITLE.AREA) currentSong.value.xmlObject.TITLE.AREA = plainArea

  selectedCoords.value = newSelectedCoords
  activePopover.value = null
}

/**
 * 功能 2：区间清空 + 高性能等间隔复制
 */
function handleDuplicateSubmit() {
  const area = currentSong.value?.xmlObject?.TITLE?.AREA
  if (!area || selectedCoords.value.size === 0) return

  const selectedObs = getSelectedObstacles()
  // 校验逻辑
  if (!validateSelection(selectedObs)) return

  const targetBase = Math.max(0, Number(duplicateBaseCoord.value) || 0)

  const coords = selectedObs.map((item) => +item.Coord)
  const minCoord = Math.min(...coords)
  const maxCoord = Math.max(...coords)
  const span = maxCoord - minCoord
  const targetEnd = targetBase + span

  const newObstacles: NoteData[] = []
  const newSelectedCoords = new Set<number>()

  selectedObs.forEach((item) => {
    const relativeOffset = +item.Coord - minCoord
    const newCoord = targetBase + relativeOffset
    newObstacles.push({
      ...item,
      Coord: String(newCoord),
    })
    newSelectedCoords.add(newCoord)
  })

  const plainArea = (area as NoteData[]).filter((item: NoteData) => {
    const c = +item.Coord
    return c < targetBase || c > targetEnd
  })

  plainArea.push(...newObstacles)
  plainArea.sort((a, b) => +a.Coord - +b.Coord)

  if (currentSong.value?.xmlObject.TITLE.AREA) currentSong.value.xmlObject.TITLE.AREA = plainArea

  selectedCoords.value = newSelectedCoords
  activePopover.value = null
}

/**
 * 功能：消除星星
 */
function handleRemoveStars() {
  const area = currentSong.value?.xmlObject?.TITLE?.AREA
  if (!area || selectedCoords.value.size === 0) return

  const selectedSet = selectedCoords.value

  if (currentSong.value)
    currentSong.value.xmlObject.TITLE.AREA = area.map((item) => {
      const coord = +item.Coord
      if (selectedSet.has(coord)) {
        const currentType = String(item.Kind ?? item.Kind)
        if (currentType === '26' || currentType === '27') {
          const newKind = StarNotetransformMap[currentType]
          const newNote = NoteType[newKind]

          return {
            ...item,
            Kind: newNote.Kind,
            Level: newNote.Level,
          }
        }
      }
      return item
    })

  activePopover.value = null
}

/**
 * 功能：随机夹星
 */
function handleAddStars() {
  const area = currentSong.value?.xmlObject?.TITLE?.AREA
  if (!area || selectedCoords.value.size === 0) return

  const selectedSet = selectedCoords.value
  const targetTypes = new Set(['18', '19', '26', '27'])

  if (currentSong.value)
    currentSong.value.xmlObject.TITLE.AREA = area.map((item) => {
      const coord = +item.Coord
      if (selectedSet.has(coord)) {
        const currentType = String(item.Kind ?? item.Kind) as '18' | '19' | '26' | '27'
        if (targetTypes.has(currentType)) {
          if (Math.random() < 0.5) {
            const newKind = StarNotetransformMap[currentType]
            const newNote = NoteType[newKind]
            return {
              ...item,
              Kind: newNote.Kind,
              Level: newNote.Level,
            }
          }
        }
      }
      return item
    })

  activePopover.value = null
}

/**
 * 功能：镜子模式
 */
function handleMirrorMode() {
  const area = currentSong.value?.xmlObject?.TITLE?.AREA
  if (!area || selectedCoords.value.size === 0) return

  const selectedObs = getSelectedObstacles()
  // 校验逻辑
  if (!validateSelection(selectedObs)) return

  const selectedSet = selectedCoords.value

  if (currentSong.value)
    currentSong.value.xmlObject.TITLE.AREA = area.map((item) => {
      const coord = +item.Coord
      if (selectedSet.has(coord)) {
        const currentKind = String(item.Kind)
        const pair = mirrorModeMap[currentKind as keyof typeof mirrorModeMap]

        if (pair) {
          const targetKind = pair.find((k) => k !== currentKind) || currentKind
          return {
            ...item,
            Kind: targetKind,
          }
        }
      }
      return item
    })

  activePopover.value = null
}

const actionButtons = computed(() => [
  {
    id: 'align',
    label: '对齐障碍',
    action: () => {
      if (activePopover.value !== 'align') {
        alignOffset.value = 0
        activePopover.value = 'align'
        nextTick(() => {
          alignInputRef.value?.focus()
          alignInputRef.value?.select()
        })
      } else {
        activePopover.value = null
      }
    },
  },
  {
    id: 'duplicate',
    label: '复制副本',
    action: () => {
      if (activePopover.value !== 'duplicate') {
        const selectedObs = getSelectedObstacles()
        if (selectedObs.length > 0) {
          const maxCoord = +selectedObs[selectedObs.length - 1].Coord
          // 设置默认值为：最后一个 coord + stepCoord
          duplicateBaseCoord.value = maxCoord + Number(stepCoord.value || 0)
        } else {
          duplicateBaseCoord.value = 0
        }
        activePopover.value = 'duplicate'
        nextTick(() => {
          duplicateInputRef.value?.focus()
          duplicateInputRef.value?.select()
        })
      } else {
        activePopover.value = null
      }
    },
  },
  {
    id: 'mirror-mode',
    label: '镜子模式',
    action: handleMirrorMode,
  },
  {
    id: 'remove-star',
    label: '消除星星',
    action: handleRemoveStars,
  },
  {
    id: 'add-star',
    label: '随机夹星',
    action: handleAddStars,
  },
  {
    id: 'delete',
    label: '批量删除',
    customClass: 'bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-200',
    action: () => {
      handleBatchDelete()
    },
  },
])
</script>
