<!-- components/ObstacleSelector.vue -->
<template>
  <div class="flex flex-col gap-2.5">
    <div v-for="(row, rowIndex) in layoutConfig" :key="rowIndex" class="flex flex-row items-center gap-2.5">
      <template v-for="(id, colIndex) in row" :key="id || `empty-${rowIndex}-${colIndex}`">

        <div v-if="id" class="relative">
          <!-- 障碍物主选择按钮 -->
          <button @click="selectObstacle(id)"
            class="group relative flex items-center justify-center rounded-xl p-2 transition-all duration-200" :class="[
              selectedObstacle?.Kind === String(id)
                ? 'border border-slate-800 bg-slate-800 shadow-xs'
                : 'border border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
            ]">
            <div class="relative flex items-center justify-center max-w-20">
              <img :src="getObstacleImageUrl(id)" :alt="`Obstacle ${id}`"
                class="h-full w-full object-contain pointer-events-none transition-transform duration-200 group-hover:scale-105" />
            </div>
          </button>

          <!-- 特殊障碍物 ID 161 专属配置按钮 + Popover -->
          <el-popover v-if="String(id) === '161'" placement="top-end" :width="268" trigger="click"
            popper-class="!p-3.5 !rounded-xl !border-slate-200 !bg-white/95 !shadow-xl !backdrop-blur-md">
            <template #reference>
              <button
                class="absolute -top-1.5 -right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95"
                title="配置随机障碍物池">
                <el-icon :size="13">
                  <Setting />
                </el-icon>
              </button>
            </template>

            <!-- Popover 内部内容 -->
            <div>
              <!-- 候选障碍池 -->
              <div class="mb-3">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-medium text-slate-400">候选障碍池</span>
                  <span class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    已选 {{ globalConfigStore.randomType?.length || 0 }} 项
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto p-0.5">
                  <button v-for="item in defaultGlobalConfig.randomType" :key="item" @click="toggleRandomType(item)"
                    class="group flex h-10 w-full items-center justify-center rounded-lg border p-1 transition-all shrink-0 active:scale-95"
                    :class="[
                      isRandomTypeSelected(item)
                        ? 'border-slate-800 bg-slate-800 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                    ]">
                    <img :src="getObstacleImageUrl(String(item))" :alt="`Obstacle ${item}`"
                      class="h-full w-full object-contain pointer-events-none" />
                  </button>
                </div>
              </div>

              <!-- 重复出现概率 -->
              <div class="pt-2.5 border-t border-slate-100">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-medium text-slate-400">重复出现概率</span>
                  <div class="flex items-center gap-1">
                    <input type="number" min="0" max="100" v-model.number="globalConfigStore.repeatChance"
                      class="w-12 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-right font-mono text-xs font-semibold text-slate-700 transition-all focus:border-slate-400 focus:bg-white focus:outline-hidden [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    <span class="text-xs font-medium text-slate-400">%</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input type="range" min="0" max="100" step="1" v-model.number="globalConfigStore.repeatChance"
                    class="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-slate-700 focus:outline-hidden" />
                </div>
              </div>
            </div>
          </el-popover>
        </div>

        <!-- 空位占位 -->
        <div v-else
          class="invisible flex items-center justify-center p-2 rounded-xl border border-transparent pointer-events-none"
          aria-hidden="true">
          <div class="relative flex items-center justify-center max-w-20">
            <img v-if="getColumnSampleId(colIndex)" :src="getObstacleImageUrl(getColumnSampleId(colIndex)!)"
              class="h-full w-full object-contain" />
          </div>
        </div>

      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { Setting } from '@element-plus/icons-vue';
import { useMagicKeys } from '@vueuse/core';
import { useAppStore } from '@/store/store';
import { NoteType } from '@/note';
import { useGlobalConfigStore, defaultGlobalConfig } from '@/store/global-config';

const store = useAppStore();
const { selectedObstacle } = storeToRefs(store);
const globalConfigStore = useGlobalConfigStore();

// ================= 按键监听 (8方向互斥 + 长按) =================
const { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } = useMagicKeys();

const DIRECTION_DEBOUNCE = 35; // 允许的双手/双键按下的毫秒级时差
const LONG_PRESS_THRESHOLD = 500; // 长按判定时间 (ms)

let evaluationTimer: ReturnType<typeof setTimeout> | null = null;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let hasExecutedInCurrentPress = false; // 保证单次按下只触发一次短按

function clearLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function evaluateDirection() {
  if (hasExecutedInCurrentPress) return;

  const u = ArrowUp.value;
  const d = ArrowDown.value;
  const l = ArrowLeft.value;
  const r = ArrowRight.value;

  type ActionType = 'up' | 'down' | 'left' | 'right' | 'left_up' | 'right_up' | 'other' | null;
  let currentAction: ActionType = null;

  // 1. 对角线优先
  if (u && l) {
    selectObstacle("20");
    currentAction = 'left_up';
  } else if (u && r) {
    selectObstacle("21");
    currentAction = 'right_up';
  } else if (d && l) {
    selectObstacle("22");
    currentAction = 'other';
  } else if (d && r) {
    selectObstacle("23");
    currentAction = 'other';
  }
  // 2. 纯单方向
  else if (u && !d && !l && !r) {
    selectObstacle("16");
    currentAction = 'up';
  } else if (d && !u && !l && !r) {
    selectObstacle("17");
    currentAction = 'down';
  } else if (l && !r && !u && !d) {
    selectObstacle("18");
    currentAction = 'left';
  } else if (r && !l && !u && !d) {
    selectObstacle("19");
    currentAction = 'right';
  } else {
    return; // 非合法组合不标记已执行
  }

  hasExecutedInCurrentPress = true;

  // 开启指定方向的长按监听占位
  clearLongPress();
  if (currentAction && currentAction !== 'other') {
    longPressTimer = setTimeout(() => {
      if (currentAction === 'up') {
        selectObstacle("136");
      } else if (currentAction === 'down') {
        selectObstacle("139");
      } else if (currentAction === 'left') {
        selectObstacle("142");
      } else if (currentAction === 'right') {
        selectObstacle("145");
      } else if (currentAction === 'left_up') {
        selectObstacle("130");
      } else if (currentAction === 'right_up') {
        selectObstacle("133");
      }
    }, LONG_PRESS_THRESHOLD);
  }
}

// 监听按键状态和开关状态
watch(
  [ArrowUp, ArrowDown, ArrowLeft, ArrowRight, () => globalConfigStore.directionKeyMap],
  ([u, d, l, r, isMapEnabled]) => {
    // 若未启用方向键映射，清理所有状态和定时器
    if (!isMapEnabled) {
      if (evaluationTimer) clearTimeout(evaluationTimer);
      clearLongPress();
      hasExecutedInCurrentPress = false;
      return;
    }

    const isAnyPressed = u || d || l || r;

    if (isAnyPressed) {
      if (!hasExecutedInCurrentPress) {
        if (evaluationTimer) clearTimeout(evaluationTimer);
        evaluationTimer = setTimeout(evaluateDirection, DIRECTION_DEBOUNCE);
      }
    } else {
      // 键全部松开，重置状态准备下一次按键并清除长按
      if (evaluationTimer) clearTimeout(evaluationTimer);
      clearLongPress();
      hasExecutedInCurrentPress = false;
    }
  }
);

onUnmounted(() => {
  if (evaluationTimer) clearTimeout(evaluationTimer);
  clearLongPress();
});

// ================= 组件原有逻辑 =================
const layoutConfig = ref<(string | null)[][]>([
  ['19', '18', '145', '142'],
  ['26', '27', null, null],
  ['22', '23', null, null],
  ['20', '21', '130', '133'],
  ['16', '17', '136', '139'],
  ['24', '161', null, null],
]);

function getColumnSampleId(colIndex: number): string | null {
  for (const row of layoutConfig.value) {
    if (row[colIndex]) return row[colIndex];
  }
  return null;
}

function getObstacleImageUrl(id: string) {
  return new URL(`../assets/note/${id}.png`, import.meta.url).href;
}

function isRandomTypeSelected(item: number): boolean {
  return globalConfigStore.randomType?.includes(item) ?? false;
}

function toggleRandomType(item: number) {
  const current = globalConfigStore.randomType || [];
  if (current.includes(item)) {
    if (current.length > 1) {
      globalConfigStore.randomType = current.filter(id => id !== item);
    }
  } else {
    globalConfigStore.randomType = [...current, item];
  }
}

function selectObstacle(id: string) {
  const note = NoteType[id];
  if (note) {
    store.selectedObstacle = note;
  }
}
</script>