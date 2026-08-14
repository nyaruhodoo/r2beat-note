<template>
  <aside class="flex h-full w-full flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 overflow-hidden">
    <!-- 头部标题区 -->
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
      <!-- 滚动视图区 -->
      <div class="flex-1 overflow-y-auto pr-1">

        <!-- 视图 2：参数配置组件 -->
        <ObstacleConfig v-show="activeView === 'config'" />
      </div>

      <!-- 抽离出的批量操作组件 -->
      <BatchActionBar />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ObstacleConfig from './ObstacleConfig.vue';
import BatchActionBar from './BatchActionBar.vue';

const activeView = ref<'selector' | 'config'>('selector');
</script>