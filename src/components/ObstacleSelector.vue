<!-- components/ObstacleSelector.vue -->
<template>
  <div class="flex flex-col gap-2.5">
    <div v-for="(row, rowIndex) in layoutConfig" :key="rowIndex" class="flex flex-row items-center gap-2.5">
      <template v-for="(id, colIndex) in row" :key="id || `empty-${rowIndex}-${colIndex}`">

        <div v-if="id" class="relative">
          <!-- 障碍物主选择按钮 -->
          <button @click="selectObstacle(id)"
            class="group flex items-center justify-center rounded-xl p-2 transition-all" :class="[
              selectedObstacle?.Kind === String(id)
                ? 'border border-zinc-800 bg-zinc-900'
                : 'border border-slate-200 bg-slate-100 hover:border-slate-300 hover:bg-slate-200/70'
            ]">
            <div class="relative flex items-center justify-center max-w-20">
              <img :src="getObstacleImageUrl(id)" :alt="`Obstacle ${id}`"
                class="h-full w-full object-contain pointer-events-none" />
            </div>
          </button>

          <!-- 特殊障碍物 ID 161 专属配置按钮 + Popover -->
          <el-popover v-if="String(id) === '161'" placement="top-end" :width="268" trigger="click"
            popper-class="!p-3.5 !rounded-2xl !border-slate-200/90 !bg-white/95 !shadow-2xl !backdrop-blur-md">
            <template #reference>
              <button
                class="absolute -top-1.5 -right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-tr from-indigo-600 to-violet-500 text-white shadow-md transition-all hover:scale-110 hover:shadow-indigo-500/30 active:scale-95"
                title="配置随机障碍物池">
                <el-icon :size="14">
                  <Setting />
                </el-icon>
              </button>
            </template>

            <!-- Popover 内部内容 -->
            <div>
              <div class="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-bold text-slate-800">随机障碍配置</span>
                </div>
              </div>

              <div class="mb-3">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-[11px] font-semibold text-slate-500">候选障碍池</span>
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    已选 {{ globalConfigStore.randomType?.length || 0 }} 项
                  </span>
                </div>

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
          </el-popover>
        </div>

        <div v-else
          class="invisible flex items-center justify-center p-2 rounded-xl border border-transparent pointer-events-none"
          aria-hidden="true">
          <!-- 借用本列第一行非空元素的图片占位，保证宽度与真实的等大 -->
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
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { Setting } from '@element-plus/icons-vue';
import { useAppStore } from '@/store/store';
import { NoteType } from '@/note';
import { useGlobalConfigStore, defaultGlobalConfig } from '@/store/global-config';

const store = useAppStore();
const { selectedObstacle } = storeToRefs(store);
const globalConfigStore = useGlobalConfigStore();

// 补齐 null 的数组布局
const layoutConfig = ref<(string | null)[][]>([
  ['19', '18', '145', '142'],
  ['26', '27', null, null],
  ['22', '23', null, null],
  ['20', '21', '130', '133'],
  ['16', '17', '136', '139'],
  ['24', '161', null, null],
]);

// 寻找该列中第一个存在的真实 obstacle ID，用来给占位块撑开相同的自然尺寸
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