<!-- SongStatsDialog.vue -->
<template>
  <div class="py-2">
    <!-- 在这里编写你的统计图表、音符数量、BPM、Note密度等组件逻辑 -->
    <p class="text-sm text-slate-500">当前谱面：{{ xmlData?.TITLE?.Name || '未命名' }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  xmlData?: Record<string, any>
}>()
</script>