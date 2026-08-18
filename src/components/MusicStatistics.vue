<template>
  <el-dialog
    v-model="visible"
    width="460px"
    destroy-on-close
    align-center
    modal-class="clean-dialog-wrapper"
  >
    <CanvasUi :distortion="distortion" :color="difficultyColorMap.NORMAL">
      <!-- 主卡片容器 -->
      <div
        class="flex flex-col justify-between overflow-visible rounded-[36px] border border-white/60 bg-white/95 p-8 text-slate-800 backdrop-blur-xl select-none"
      >
        <!-- 1. 顶部：难度等级展示 -->
        <div class="mb-2 flex items-center justify-between border-b border-slate-100/80 pb-5">
          <span class="text-xs font-bold tracking-widest text-slate-400">难度等级</span>
          <div class="flex items-baseline gap-1.5">
            <span class="font-mono text-4xl font-black tracking-tight text-slate-900">{{
              statsData.difficulty
            }}</span>
          </div>
        </div>

        <!-- 2. 中间：数据统计 Grid (3列排布) -->
        <div class="my-2 grid grid-cols-3 gap-3.5">
          <div
            class="flex flex-col rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100/50 p-3.5 shadow-sm"
          >
            <span class="mb-1 text-[11px] font-semibold text-slate-400">音乐时长</span>
            <div class="font-mono text-base font-extrabold text-slate-800">
              {{ statsData.duration }}
            </div>
          </div>

          <div
            class="flex flex-col rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100/50 p-3.5 shadow-sm"
          >
            <span class="mb-1 text-[11px] font-semibold text-slate-400">变速范围</span>
            <div class="font-mono text-base font-extrabold tracking-tight text-slate-800">
              {{ statsData.bpmRange }}
            </div>
          </div>

          <div
            class="flex flex-col rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100/50 p-3.5 shadow-sm"
          >
            <span class="mb-1 text-[11px] font-semibold text-slate-400">总音符</span>
            <div class="font-mono text-base font-extrabold text-slate-800">
              {{ statsData.totalNotes?.toLocaleString() }}
            </div>
          </div>

          <div
            class="flex flex-col rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100/50 p-3.5 shadow-sm"
          >
            <span class="mb-1 text-[11px] font-semibold text-slate-400">平均密度</span>
            <div class="font-mono text-base font-extrabold text-slate-800">
              {{ statsData.avgNps }} <span class="text-[10px] font-medium text-slate-400">/s</span>
            </div>
          </div>

          <div
            class="flex flex-col rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100/50 p-3.5 shadow-sm"
          >
            <span class="mb-1 text-[11px] font-semibold text-slate-400">峰值密度</span>
            <div class="font-mono text-base font-extrabold text-slate-800">
              {{ statsData.peakNps }} <span class="text-[10px] font-medium text-slate-400">/s</span>
            </div>
          </div>

          <div
            class="flex flex-col rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100/50 p-3.5 shadow-sm"
          >
            <span class="mb-1 text-[11px] font-semibold text-slate-400">高压区间</span>
            <div class="font-mono text-base font-extrabold text-slate-800">
              {{ statsData.peakNps }} <span class="text-[10px] font-medium text-slate-400">%</span>
            </div>
          </div>
        </div>
      </div>
    </CanvasUi>
  </el-dialog>
</template>

<script setup lang="ts">
import CanvasUi from './CanvasUi.vue'

const visible = defineModel('visible', { type: Boolean, default: false })

const difficultyColorMap: Record<string, [number, number, number]> = {
  EASY: [0.22, 0.78, 0.45], // 绿色 (简单)
  NORMAL: [0.3059, 0.5373, 1], // 当前蓝色 (中等)
  HARD: [1.0, 0.42, 0.42], // 淡红 (偏难)
  EXPERT: [0.82, 0.12, 0.18], // 深红 (很难)
  MASTER: [0.45, 0.05, 0.08], // 暗黑 (最难)
}

// 内部静态数据配置
const distortion = 50

const statsData = {
  difficulty: '7.5',
  duration: '02:18',
  totalNotes: 1280,
  bpmRange: '140-220',
  avgNps: 8.4,
  peakNps: 30,
  highDensityDuration: '00:32',
}
</script>

<style>
/* 针对该 dialog 实例重置样式 */
.clean-dialog-wrapper .el-dialog {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 12px !important;
  /* 预留 space 供画布和阴影展开 */
  border-radius: 0 !important;
  overflow: visible !important;
}

.clean-dialog-wrapper .el-dialog__header {
  display: none !important;
}

.clean-dialog-wrapper .el-dialog__body {
  padding: 0 !important;
  overflow: visible !important;
}
</style>
