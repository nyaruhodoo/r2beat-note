<template>
  <div v-show="selectedCoords.size > 0" class="mt-auto pt-3 shrink-0 border-t border-slate-100 bg-white">
    <!-- 头部：状态展示 -->
    <div class="flex items-center justify-between mb-2.5 px-1">
      <div class="flex items-center gap-1.5">
        <span class="relative flex h-2 w-2">
          <span class="bg-indigo-400 animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"></span>
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

      <!-- 1. 对齐/平移障碍 气泡弹出框 -->
      <Transition enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-1 scale-95" enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-1 scale-95">
        <div v-if="activePopover === 'align'"
          class="absolute bottom-full mb-2 left-0 right-0 z-20 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xl ring-1 ring-black/5">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-bold text-slate-700">对齐/偏移 Coord</span>
            <button @click="activePopover = null" class="text-slate-400 hover:text-slate-600 text-xs px-1">✕</button>
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

      <!-- 2. 复制副本 气泡弹出框 -->
      <Transition enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-1 scale-95" enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-1 scale-95">
        <div v-if="activePopover === 'duplicate'"
          class="absolute bottom-full mb-2 left-0 right-0 z-20 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xl ring-1 ring-black/5">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-bold text-slate-700">复制副本 (按基准 Coord)</span>
            <button @click="activePopover = null" class="text-slate-400 hover:text-slate-600 text-xs px-1">✕</button>
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { twMerge } from 'tailwind-merge';
import { useAppStore, type NoteData } from '@/store/store';
import { NoteType, StarNotetransformMap } from '@/note';


const store = useAppStore();
const { selectedCoords, currentSong } = storeToRefs(store);

const activePopover = ref<'align' | 'duplicate' | null>(null);
const alignOffset = ref<number>(0);
const duplicateBaseCoord = ref<number>(0);

const obstacles = computed(() => {
  const areaData = currentSong.value?.xmlObject?.TITLE?.AREA;
  if (!areaData) return [];
  return areaData;
});

function handleSelectAll() {
  const newSet = new Set(obstacles.value.map(obs => +obs.Coord));
  selectedCoords.value = newSet;
}

function handleClearSelection() {
  selectedCoords.value.clear();
}

/**
 * 双指针获取已选障碍物
 */
function getSelectedObstacles(): NoteData[] {
  const coordsList = Array.from(selectedCoords.value).sort((a, b) => a - b);
  const obs = obstacles.value;
  const result: NoteData[] = [];

  let i = 0;
  let j = 0;

  while (i < coordsList.length && j < obs.length) {
    const targetCoord = coordsList[i];
    const currentCoord = +obs[j].Coord;

    if (currentCoord === targetCoord) {
      result.push(obs[j]);
      i++;
      j++;
    } else if (currentCoord < targetCoord) {
      j++;
    } else {
      i++;
    }
  }

  return result;
}

/**
 * 批量删除
 */
function handleBatchDelete() {
  if (!currentSong.value?.xmlObject?.TITLE?.AREA || selectedCoords.value.size === 0) return;

  const selectedSet = selectedCoords.value;
  const plainArea = currentSong.value.xmlObject.TITLE.AREA.filter(
    (item: NoteData) => !selectedSet.has(+item.Coord)
  );

  currentSong.value.xmlObject.TITLE.AREA = plainArea;
  handleClearSelection();
}

/**
 * 功能 1：对齐/偏移障碍物 (自动碰撞检测与覆盖)
 */
function handleAlignSubmit() {
  const area = currentSong.value?.xmlObject?.TITLE?.AREA;
  if (!area || selectedCoords.value.size === 0) return;

  const offset = Number(alignOffset.value) || 0;
  if (offset === 0) {
    activePopover.value = null;
    return;
  }

  const selectedSet = selectedCoords.value;
  const selectedObs = getSelectedObstacles();
  if (selectedObs.length === 0) return;

  const movedMap = new Map<number, NoteData>();
  const newSelectedCoords = new Set<number>();

  selectedObs.forEach(note => {
    const newCoord = Math.max(0, +note.Coord + offset);
    movedMap.set(newCoord, { ...note, Coord: String(newCoord) });
    newSelectedCoords.add(newCoord);
  });

  const plainArea = (area as NoteData[]).filter((item: NoteData) => {
    const coord = +item.Coord;
    if (selectedSet.has(coord)) return false;
    if (movedMap.has(coord)) return false;
    return true;
  });

  plainArea.push(...Array.from(movedMap.values()));
  plainArea.sort((a, b) => +a.Coord - +b.Coord);

  if (currentSong.value?.xmlObject.TITLE.AREA)
    currentSong.value.xmlObject.TITLE.AREA = plainArea;

  selectedCoords.value = newSelectedCoords;
  activePopover.value = null;
}

/**
 * 功能 2：区间清空 + 高性能等间隔复制
 */
function handleDuplicateSubmit() {
  const area = currentSong.value?.xmlObject?.TITLE?.AREA;
  if (!area || selectedCoords.value.size === 0) return;

  const targetBase = Math.max(0, Number(duplicateBaseCoord.value) || 0);
  const selectedObs = getSelectedObstacles();
  if (selectedObs.length === 0) return;

  const coords = selectedObs.map(item => +item.Coord);
  const minCoord = Math.min(...coords);
  const maxCoord = Math.max(...coords);
  const span = maxCoord - minCoord;
  const targetEnd = targetBase + span;

  const newObstacles: NoteData[] = [];
  const newSelectedCoords = new Set<number>();

  selectedObs.forEach(item => {
    const relativeOffset = +item.Coord - minCoord;
    const newCoord = targetBase + relativeOffset;
    newObstacles.push({
      ...item,
      Coord: String(newCoord)
    });
    newSelectedCoords.add(newCoord);
  });

  const plainArea = (area as NoteData[]).filter((item: NoteData) => {
    const c = +item.Coord;
    return c < targetBase || c > targetEnd;
  });

  plainArea.push(...newObstacles);
  plainArea.sort((a, b) => +a.Coord - +b.Coord);

  if (currentSong.value?.xmlObject.TITLE.AREA)
    currentSong.value.xmlObject.TITLE.AREA = plainArea;

  selectedCoords.value = newSelectedCoords;
  activePopover.value = null;
}

/**
 * 功能：消除星星
 */
function handleRemoveStars() {
  const area = currentSong.value?.xmlObject?.TITLE?.AREA;
  if (!area || selectedCoords.value.size === 0) return;

  const selectedSet = selectedCoords.value;

  if (currentSong.value)
    currentSong.value.xmlObject.TITLE.AREA = area.map((item) => {
      const coord = +item.Coord;
      if (selectedSet.has(coord)) {
        const currentType = String(item.Kind ?? item.Kind);
        if (currentType === '26' || currentType === '27') {
          const newKind = StarNotetransformMap[currentType];
          const newNote = NoteType[newKind];

          return {
            ...item,
            Kind: newNote.Kind,
            Level: newNote.Level,
          };
        }
      }
      return item;
    });

  activePopover.value = null;
}

/**
 * 功能：随机夹星
 */
function handleAddStars() {
  const area = currentSong.value?.xmlObject?.TITLE?.AREA;
  if (!area || selectedCoords.value.size === 0) return;

  const selectedSet = selectedCoords.value;
  const targetTypes = new Set(['18', '19', '26', '27']);

  if (currentSong.value)
    currentSong.value.xmlObject.TITLE.AREA = area.map((item) => {
      const coord = +item.Coord;
      if (selectedSet.has(coord)) {
        const currentType = String(item.Kind ?? item.Kind) as '18' | '19' | '26' | '27';
        if (targetTypes.has(currentType)) {
          if (Math.random() < 0.5) {
            const newKind = StarNotetransformMap[currentType];
            const newNote = NoteType[newKind];
            return {
              ...item,
              Kind: newNote.Kind,
              Level: newNote.Level,
            };
          }
        }
      }
      return item;
    });

  activePopover.value = null;
}

const actionButtons = computed(() => [
  {
    id: 'align',
    label: '对齐障碍',
    action: () => {
      if (activePopover.value !== 'align') {
        alignOffset.value = 0;
        activePopover.value = 'align';
      } else {
        activePopover.value = null;
      }
    }
  },
  {
    id: 'duplicate',
    label: '复制副本',
    action: () => {
      if (activePopover.value !== 'duplicate') {
        duplicateBaseCoord.value = 0;
        activePopover.value = 'duplicate';
      } else {
        activePopover.value = null;
      }
    }
  },
  {
    id: 'remove-star',
    label: '消除星星',
    action: handleRemoveStars
  },
  {
    id: 'add-star',
    label: '随机夹星',
    action: handleAddStars
  },
  {
    id: 'delete',
    label: '批量删除',
    customClass: 'bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-200',
    action: () => {
      handleBatchDelete();
    }
  }
]);
</script>