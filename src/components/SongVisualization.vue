<template>
  <aside
    class="flex h-full w-full flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6"
  >
    <el-tabs v-model="activeTab" class="custom-tabs flex min-h-0 flex-1 flex-col overflow-hidden">
      <el-tab-pane label="快捷键预览" name="selector" class="h-full overflow-hidden">
        <div class="flex h-full flex-col gap-5 overflow-y-auto">
          <!-- <AudioWaveformVisualizer :seek-to="seekTo"></AudioWaveformVisualizer> -->
          <ShortcutKeyTip></ShortcutKeyTip>
        </div>
      </el-tab-pane>

      <el-tab-pane label="参数配置" name="config" class="h-full overflow-hidden">
        <div class="h-full overflow-y-auto">
          <ObstacleConfig />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 底部批量操作组件固定在底部 -->
    <BatchActionBar />
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import BatchActionBar from './BatchActionBar.vue'
import ObstacleConfig from './ObstacleConfig.vue'
import ShortcutKeyTip from './ShortcutKeyTip.vue'
// import AudioWaveformVisualizer from './AudioWaveformVisualizer.vue';

defineProps<{
  seekTo?: (target: number | string, type: 'time' | 'frame' | 'coord') => void
}>()

// 仅保留当前选中的 Tab 标识
const activeTab = ref<'selector' | 'config'>('selector')
</script>

<style scoped>
/* 确保 Tabs 内部容器能够正确撑满 flex 布局并实现局部滚动 */
:deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

:deep(.el-tab-pane) {
  height: 100%;
}
</style>
