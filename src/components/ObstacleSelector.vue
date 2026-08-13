<template>
  <aside class="flex h-full w-full flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 overflow-hidden">
    <!-- 头部标题区：右侧添加视图切换按钮 -->
    <div class="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
      <h2 class="text-base font-bold text-slate-800">
        {{ activeView === 'selector' ? '障碍物选择器' : '参数配置' }}
      </h2>
      <button @click="activeView = activeView === 'selector' ? 'config' : 'selector'"
        class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200">
        {{ activeView === 'selector' ? '切换至参数配置' : '返回障碍物选择' }}
      </button>
    </div>

    <!-- 主体内容与底部容器 -->
    <div class="flex flex-1 flex-col overflow-hidden min-h-0">
      <!-- 滚动视图区：上面的内容溢出时在此处出现滚动条 -->
      <div class="flex-1 overflow-y-auto pr-1">
        <!-- 视图 1：选择器列表 -->
        <div v-show="activeView === 'selector'" class="flex flex-col gap-2.5">
          <div v-for="(row, rowIndex) in layoutConfig" :key="rowIndex"
            class="flex flex-row items-center gap-2.5 shrink-0">
            <template v-for="id in row" :key="id">
              <button @click="selectObstacle(id)"
                class="group flex items-center justify-center rounded-xl p-2 transition-all shrink-0" :class="[
                  selectedObstacle?.Kind === String(id)
                    ? 'border border-slate-200 bg-indigo-200'
                    : 'border border-slate-200 bg-slate-100 hover:border-slate-300 hover:bg-slate-200/70'
                ]">
                <div class="relative flex items-center justify-center shrink-0 max-w-20">
                  <img :src="getObstacleImageUrl(id)" :alt="`Obstacle ${id}`"
                    class="h-full w-full object-contain pointer-events-none" />
                </div>
              </button>
            </template>
          </div>
        </div>

        <!-- 视图 2：参数配置组件 -->
        <ObstacleConfig v-show="activeView === 'config'" />
      </div>

      <div v-show="selectedCoords.size > 0" class="mt-auto pt-3 shrink-0 border-t border-slate-100 bg-white">
        <!-- 头部：状态展示 -->
        <div class="flex items-center justify-between mb-2.5 px-1">
          <div class="flex items-center gap-1.5">
            <span class="relative flex h-2 w-2">
              <span
                class="bg-indigo-400 animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"></span>
              <span class="bg-indigo-500 relative inline-flex rounded-full h-2 w-2"></span>
            </span>
            <span class="text-xs font-medium text-slate-500">已选中</span>
            <span class="text-xs font-bold text-slate-800">{{ selectedCoords.size }}</span>
            <span class="text-[11px] text-slate-400">项</span>
          </div>

          <!-- 右侧操作组 -->
          <div class="flex items-center gap-2">
            <button @click="handleSelectAll"
              class="text-[11px] font-medium text-slate-400 hover:text-indigo-600 transition-colors">
              全选
            </button>
            <span class="text-slate-200 text-[10px]">|</span>
            <button @click="handleClearSelection"
              class="text-[11px] font-medium text-slate-400 hover:text-rose-500 transition-colors">
              清空已选
            </button>
          </div>
        </div>

        <!-- 多按钮矩阵与气泡弹出框容器 -->
        <div class="relative grid grid-cols-3 gap-1.5">
          <!-- 点击气泡框外部遮罩关闭Popover -->
          <div v-if="activePopover" class="fixed inset-0 z-10" @click="activePopover = null"></div>

          <!-- 1. 对齐/平移障碍 气泡弹出框 (带平滑过渡动画) -->
          <Transition enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-1 scale-95" enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-1 scale-95">
            <div v-if="activePopover === 'align'"
              class="absolute bottom-full mb-2 left-0 right-0 z-20 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xl ring-1 ring-black/5">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-bold text-slate-700">对齐/偏移 Coord</span>
                <button @click="activePopover = null"
                  class="text-slate-400 hover:text-slate-600 text-xs px-1">✕</button>
              </div>
              <p class="text-[11px] text-slate-400 mb-2">平移选中障碍物，新位置已有障碍物将被覆盖</p>
              <div class="flex items-center gap-1.5">
                <input type="number" v-model.number="alignOffset" placeholder="偏移量 (+/-)"
                  class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <button @click="handleAlignSubmit"
                  class="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors">
                  应用
                </button>
              </div>
            </div>
          </Transition>

          <!-- 2. 复制副本 气泡弹出框 (带平滑过渡动画) -->
          <Transition enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-1 scale-95" enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-1 scale-95">
            <div v-if="activePopover === 'duplicate'"
              class="absolute bottom-full mb-2 left-0 right-0 z-20 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xl ring-1 ring-black/5">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-bold text-slate-700">复制副本 (按基准 Coord)</span>
                <button @click="activePopover = null"
                  class="text-slate-400 hover:text-slate-600 text-xs px-1">✕</button>
              </div>
              <p class="text-[11px] text-slate-400 mb-2">将清空目标区间内的旧障碍物再进行填充</p>
              <div class="flex items-center gap-1.5">
                <input type="number" min="0" v-model.number="duplicateBaseCoord" placeholder="基准 Coord (≥0)"
                  class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <button @click="handleDuplicateSubmit"
                  class="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors">
                  复制
                </button>
              </div>
            </div>
          </Transition>

          <!-- 操作按钮渲染 -->
          <button v-for="btn in actionButtons" :key="btn.id" @click="btn.action" :class="twMerge(
            'flex items-center justify-center rounded-lg px-2 py-2 text-xs font-medium transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 active:bg-slate-200',
            btn.customClass
          )">
            {{ btn.label }}
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAppStore } from '@/store/store';
import { NoteType } from '@/note';
import { storeToRefs } from 'pinia';
import ObstacleConfig from './ObstacleConfig.vue';
import { twMerge } from 'tailwind-merge';

export interface NoteData {
  Coord: string
  Kind: string
  Level: string
  FxSndIndex: string
}

const activeView = ref<'selector' | 'config'>('selector');
const activePopover = ref<'align' | 'duplicate' | null>(null);

const alignOffset = ref<number>(0);
const duplicateBaseCoord = ref<number>(0);

const store = useAppStore();
const { selectedObstacle, selectedCoords, currentSong } = storeToRefs(store);

const obstacles = computed<NoteData[]>(() => {
  const areaData = currentSong.value?.xmlObject?.TITLE?.AREA
  if (!areaData) return []
  return areaData
})

const layoutConfig = ref<string[][]>([
  ['19', '18', '145', '142'],
  ['26', '27'],
  ['22', '23'],
  ['20', '21', '130', '133'],
  ['16', '17', '136', '139'],
  ['24'],
]);

function getObstacleImageUrl(id: string) {
  return new URL(`../assets/note/${id}.png`, import.meta.url).href;
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
 * 批量删除
 */
function handleBatchDelete() {
  if (!currentSong.value?.xmlObject?.TITLE?.AREA || selectedCoords.value.size === 0) return

  const selectedSet = selectedCoords.value
  const plainArea = currentSong.value.xmlObject.TITLE.AREA.filter(
    (item: NoteData) => !selectedSet.has(+item.Coord)
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

  const offset = Number(alignOffset.value) || 0
  if (offset === 0) {
    activePopover.value = null
    return
  }

  const selectedSet = selectedCoords.value
  const selectedObs = getSelectedObstacles()
  if (selectedObs.length === 0) return

  // 1. 计算移动后的目标 Coord 列表 (保持唯一性)
  const movedMap = new Map<number, NoteData>()
  const newSelectedCoords = new Set<number>()

  selectedObs.forEach(note => {
    const newCoord = Math.max(0, +note.Coord + offset)
    movedMap.set(newCoord, { ...note, Coord: String(newCoord) })
    newSelectedCoords.add(newCoord)
  })

  // 2. 在纯 JS 数组中剔除:
  //    - 原本选中的障碍物
  //    - 与新位置发生冲突/重叠的障碍物 (覆盖机制)
  const plainArea = (area as NoteData[]).filter((item: NoteData) => {
    const coord = +item.Coord
    if (selectedSet.has(coord)) return false
    if (movedMap.has(coord)) return false
    return true
  })

  // 3. 将平移后的障碍物插入纯 JS 数组
  plainArea.push(...Array.from(movedMap.values()))

  // 4. 一次性进行非响应式排序并赋值，避免 Proxy 频繁触发
  plainArea.sort((a, b) => +a.Coord - +b.Coord)
  if (currentSong.value?.xmlObject.TITLE.AREA)
    currentSong.value.xmlObject.TITLE.AREA = plainArea

  selectedCoords.value = newSelectedCoords
  activePopover.value = null
}

/**
 * 功能 2：区间清空 + 高性能等间隔复制
 */
function handleDuplicateSubmit() {
  const area = currentSong.value?.xmlObject?.TITLE?.AREA
  if (!area || selectedCoords.value.size === 0) return

  const targetBase = Math.max(0, Number(duplicateBaseCoord.value) || 0)
  const selectedObs = getSelectedObstacles()
  if (selectedObs.length === 0) return

  // 1. 获取原选中障碍物的基准与覆盖区间 [targetBase, targetEnd]
  const coords = selectedObs.map(item => +item.Coord)
  const minCoord = Math.min(...coords)
  const maxCoord = Math.max(...coords)
  const span = maxCoord - minCoord
  const targetEnd = targetBase + span

  // 2. 映射出目标副本数据
  const newObstacles: NoteData[] = []
  const newSelectedCoords = new Set<number>()

  selectedObs.forEach(item => {
    const relativeOffset = +item.Coord - minCoord
    const newCoord = targetBase + relativeOffset
    newObstacles.push({
      ...item,
      Coord: String(newCoord)
    })
    newSelectedCoords.add(newCoord)
  })

  // 3. 先清空目标区间 [targetBase, targetEnd] 内的所有原有障碍物
  const plainArea = (area as NoteData[]).filter((item: NoteData) => {
    const c = +item.Coord
    return c < targetBase || c > targetEnd
  })

  // 4. 追加新复制的障碍物
  plainArea.push(...newObstacles)

  // 5. 使用纯 JS 数组完成排序后统一更新，大幅提升性能
  plainArea.sort((a, b) => +a.Coord - +b.Coord)
  if (currentSong.value?.xmlObject.TITLE.AREA)
    currentSong.value.xmlObject.TITLE.AREA = plainArea

  selectedCoords.value = newSelectedCoords
  activePopover.value = null
}

function selectObstacle(id: string) {
  const note = NoteType[id];
  if (note) {
    store.selectedObstacle = note;
  }
}

function handleSelectAll() {
  const newSet = new Set(obstacles.value.map(obs => +obs.Coord))
  selectedCoords.value = newSet
}

function handleClearSelection() {
  selectedCoords.value.clear()
}

const actionButtons = computed(() => [
  {
    id: 'align',
    label: '对齐障碍',
    action: () => {
      if (activePopover.value !== 'align') {
        alignOffset.value = 0 // 打开时重置为 0
        activePopover.value = 'align'
      } else {
        activePopover.value = null
      }
    }
  },
  {
    id: 'duplicate',
    label: '复制副本',
    action: () => {
      if (activePopover.value !== 'duplicate') {
        duplicateBaseCoord.value = 0 // 打开时重置为 0
        activePopover.value = 'duplicate'
      } else {
        activePopover.value = null
      }
    }
  },
  {
    id: 'delete',
    label: '批量删除',
    customClass: 'bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-200',
    action: handleBatchDelete
  }
])
</script>