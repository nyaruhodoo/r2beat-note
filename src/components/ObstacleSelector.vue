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
        <!-- 视图 1：选择器列表 (主列表保持默认布局) -->
        <div v-show="activeView === 'selector'" class="flex flex-col gap-2.5">
          <div v-for="(row, rowIndex) in layoutConfig" :key="rowIndex"
            class="flex flex-row items-center gap-2.5 shrink-0">
            <template v-for="id in row" :key="id">
              <div class="relative shrink-0">
                <!-- 障碍物主选择按钮 -->
                <button @click="selectObstacle(id)"
                  class="group flex items-center justify-center rounded-xl p-2 transition-all shrink-0" :class="[
                    selectedObstacle?.Kind === String(id)
                      ? 'border border-zinc-800 bg-zinc-900'
                      : 'border border-slate-200 bg-slate-100 hover:border-slate-300 hover:bg-slate-200/70'
                  ]">
                  <div class="relative flex items-center justify-center shrink-0 max-w-20">
                    <img :src="getObstacleImageUrl(id)" :alt="`Obstacle ${id}`"
                      class="h-full w-full object-contain pointer-events-none" />
                  </div>
                </button>

                <!-- 特殊障碍物 ID 161 专属配置按钮 -->
                <button v-if="String(id) === '161'" @click.stop="toggle161Popover"
                  class="absolute -top-1.5 -right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-tr from-indigo-600 to-violet-500 text-white shadow-md transition-all hover:scale-110 hover:shadow-indigo-500/30 active:scale-95"
                  title="配置随机障碍物池">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
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

          <!-- 1. 对齐/平移障碍 气泡弹出框 -->
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

          <!-- 2. 复制副本 气泡弹出框 -->
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

    <!-- 161 专属随机障碍池配置框 (使用 Teleport 挂载到 body 下) -->
    <Teleport to="body">
      <!-- 弹框全屏遮罩：点击空白处关闭 -->
      <div v-if="is161PopoverOpen" class="fixed inset-0 z-[9998]" @click="is161PopoverOpen = false"></div>

      <!-- 弹框主体 -->
      <Transition enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-1 scale-95" enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-1 scale-95">
        <div v-if="is161PopoverOpen" :style="popoverStyle"
          class="fixed z-[9999] w-64 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md ring-1 ring-black/5"
          @click.stop>
          <!-- 头部标题 -->
          <div class="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-slate-800">随机障碍配置</span>
            </div>
            <button @click="is161PopoverOpen = false"
              class="text-slate-400 hover:text-slate-600 text-xs p-0.5 rounded hover:bg-slate-100 transition-colors">✕</button>
          </div>

          <!-- 1. 障碍物选择区 -->
          <div class="mb-3">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[11px] font-semibold text-slate-500">候选障碍池</span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                已选 {{ globalConfigStore.randomType?.length || 0 }} 项
              </span>
            </div>

            <!-- 1. 添加 p-1 给四周留出边框缓冲，解决滚动条/边缘裁切问题 -->
            <div class="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto p-1">
              <button v-for="item in defaultGlobalConfig.randomType" :key="item" @click="toggleRandomType(item)"
                class="group flex h-10 w-full items-center justify-center rounded-lg border p-1 transition-all shrink-0 active:scale-95"
                :class="[
                  isRandomTypeSelected(item)
                    ? 'border-slate-900 bg-slate-900 shadow-md ring-2 ring-slate-900/20'
                    : 'border-slate-200/80 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                ]">
                <img :src="getObstacleImageUrl(String(item))" :alt="`Obstacle ${item}`"
                  class="h-full w-full object-contain pointer-events-none" />
              </button>
            </div>
          </div>

          <!-- 2. 重复概率控制区 (新增) -->
          <div class="pt-2.5 border-t border-slate-100">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[11px] font-semibold text-slate-500">重复出现概率</span>
              <div class="flex items-center gap-1">
                <input type="number" min="0" max="100" v-model.number="globalConfigStore.repeatChance"
                  class="w-12 rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 text-center text-xs font-bold text-indigo-600 focus:border-indigo-500 focus:bg-white focus:outline-none" />
                <span class="text-[11px] text-slate-400 font-medium">%</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input type="range" min="0" max="100" step="1" v-model.number="globalConfigStore.repeatChance"
                class="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600 focus:outline-none" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, Teleport, type CSSProperties } from 'vue';
import { useAppStore, type NoteData } from '@/store/store';
import { NoteType, StarNotetransformMap } from '@/note';
import { storeToRefs } from 'pinia';
import ObstacleConfig from './ObstacleConfig.vue';
import { twMerge } from 'tailwind-merge';
import { useGlobalConfigStore, defaultGlobalConfig } from '@/store/global-config';


const activeView = ref<'selector' | 'config'>('selector');
const activePopover = ref<'align' | 'duplicate' | null>(null);

// 161 专属配置弹窗状态与定位
const is161PopoverOpen = ref(false);
const popoverStyle = ref<CSSProperties>({});

const alignOffset = ref<number>(0);
const duplicateBaseCoord = ref<number>(0);

const globalConfigStore = useGlobalConfigStore();
const store = useAppStore();
const { selectedObstacle, selectedCoords, currentSong } = storeToRefs(store);

const obstacles = computed(() => {
  const areaData = currentSong.value?.xmlObject?.TITLE?.AREA;
  if (!areaData) return [];
  return areaData;
});

// 主选择器布局恢复原结构
const layoutConfig = ref<string[][]>([
  ['19', '18', '145', '142'],
  ['26', '27'],
  ['22', '23'],
  ['20', '21', '130', '133'],
  ['16', '17', '136', '139'],
  ['24', '161'],
]);

function getObstacleImageUrl(id: string) {
  return new URL(`../assets/note/${id}.png`, import.meta.url).href;
}

/** 切换 161 配置气泡框开合，并计算 Body Teleport 的 Fixed 绝对定位 */
function toggle161Popover(event: MouseEvent) {
  activePopover.value = null;

  if (is161PopoverOpen.value) {
    is161PopoverOpen.value = false;
    return;
  }

  // 获取触发按钮在页面中的位置
  const target = event.currentTarget as HTMLElement;
  if (target) {
    const rect = target.getBoundingClientRect();
    const popoverWidth = 256; // 对应 w-64 (256px)

    // 计算水平位置：避免超界
    let left = rect.right - popoverWidth;
    if (left < 10) left = 10;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = window.innerWidth - popoverWidth - 10;
    }

    // 默认在按钮上方 8px 显示
    const bottom = window.innerHeight - rect.top + 8;

    popoverStyle.value = {
      position: 'fixed',
      left: `${left}px`,
      bottom: `${bottom}px`,
    };
  }

  is161PopoverOpen.value = true;
}

/** 判断随机障碍物选项是否已在 store 中被选中 */
function isRandomTypeSelected(item: number): boolean {
  return globalConfigStore.randomType?.includes(item) ?? false;
}

/** 切换某个随机障碍物项的选择状态并同步至 Store (最少保留 1 项) */
function toggleRandomType(item: number) {
  const current = globalConfigStore.randomType || [];
  if (current.includes(item)) {
    // 只有当选中项大于 1 时才可以取消勾选，保证至少选择 1 项
    if (current.length > 1) {
      globalConfigStore.randomType = current.filter(id => id !== item);
    }
  } else {
    globalConfigStore.randomType = [...current, item];
  }
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

function selectObstacle(id: string) {
  const note = NoteType[id];
  if (note) {
    store.selectedObstacle = note;
  }
}

function handleSelectAll() {
  const newSet = new Set(obstacles.value.map(obs => +obs.Coord));
  selectedCoords.value = newSet;
}

function handleClearSelection() {
  selectedCoords.value.clear();
}

/**
 * 功能：消除星星
 * 将选中障碍物中的 26、27 类型转换为对应的 18、19
 */
function handleRemoveStars() {
  const area = currentSong.value?.xmlObject?.TITLE?.AREA;
  if (!area || selectedCoords.value.size === 0) return;

  const selectedSet = selectedCoords.value;

  if (currentSong.value)
    currentSong.value.xmlObject.TITLE.AREA = area.map((item) => {
      const coord = +item.Coord;
      if (selectedSet.has(coord)) {
        // 兼容 xmlObject 中的 Type 或 type 字段
        const currentType = String(item.Kind ?? item.Kind);
        if (currentType === '26' || currentType === '27') {
          const newKind = StarNotetransformMap[currentType];
          const newNote = NoteType[newKind]

          return {
            ...item,
            Kind: newNote.Kind,
            Level: newNote.Level,
          };
        }
      }
      return item;
    });

  is161PopoverOpen.value = false;
  activePopover.value = null;
}
/**
 * 功能：随机夹星
 * 对选中障碍物中的 18, 19, 26, 27，按 50% 概率进行转换
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
          // 50% 概率触发类型转换
          if (Math.random() < 0.5) {
            const newKind = StarNotetransformMap[currentType];
            const newNote = NoteType[newKind]
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

  is161PopoverOpen.value = false;
  activePopover.value = null;
}

const actionButtons = computed(() => [
  {
    id: 'align',
    label: '对齐障碍',
    action: () => {
      is161PopoverOpen.value = false;
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
      is161PopoverOpen.value = false;
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
      is161PopoverOpen.value = false;
      handleBatchDelete();
    }
  }
]);
</script>