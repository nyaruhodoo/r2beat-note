<template>
  <aside class="flex h-full w-full flex-col gap-6 rounded-2xl border border-slate-200/80 bg-white p-6">
    <!-- 头部标题区：右侧添加视图切换按钮 -->
    <div class="flex items-center justify-between border-b border-slate-100 pb-4">
      <h2 class="text-base font-bold text-slate-800">
        {{ activeView === 'selector' ? '障碍物选择器' : '参数配置' }}
      </h2>
      <button @click="activeView = activeView === 'selector' ? 'config' : 'selector'"
        class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200">
        {{ activeView === 'selector' ? '切换至参数配置' : '返回障碍物选择' }}
      </button>
    </div>

    <!-- 主体区域-->
    <div class="flex-1 overflow-auto">
      <div v-if="activeView === 'selector'" class="flex flex-col gap-2.5">
        <div v-for="(row, rowIndex) in layoutConfig" :key="rowIndex"
          class="flex flex-row items-center gap-2.5 shrink-0">
          <template v-for="id in row" :key="id">
            <button @click="selectObstacle(id)"
              class="group flex items-center justify-center rounded-xl p-2 transition-all shrink-0" :class="[
                selectedObstacle?.Kind === String(id)
                  ? 'bg-indigo-200'  // 选中：实色靛蓝 + 深色边框
                  : 'border-slate-200 bg-slate-100 hover:border-slate-300 hover:bg-slate-200/70' // 未选中：实色浅灰
              ]">
              <div class="relative flex items-center justify-center shrink-0 max-w-20">
                <img :src="getObstacleImageUrl(id)" :alt="`Obstacle ${id}`"
                  class="h-full w-full object-contain pointer-events-none" />
              </div>
            </button>
          </template>
        </div>
      </div>

      <!-- 视图 2：独立抽离的参数配置组件 -->
      <ObstacleConfig v-else />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAppStore } from '@/store/store';
import { NoteType } from '@/note';
import { storeToRefs } from 'pinia';
import ObstacleConfig from './ObstacleConfig.vue';

// 当前视图状态：'selector' (选择器) | 'config' (参数配置)
const activeView = ref<'selector' | 'config'>('selector');

const store = useAppStore();
const { selectedObstacle } = storeToRefs(store);

const layoutConfig = ref<string[][]>([
  ['19', '18', '145', '142'],
  ['26', '27'],
  ['22', '23'],
  ['20', '21', '130', '133'],
  ['16', '17', '136', '139'],
  ['24'],
]);

// 动态匹配 `src/assets/note/${id}.png` 路径
function getObstacleImageUrl(id: string) {
  return new URL(`../assets/note/${id}.png`, import.meta.url).href;
}

function selectObstacle(id: string) {
  const note = NoteType[id];
  if (note) {
    store.selectedObstacle = note;
  }
}
</script>