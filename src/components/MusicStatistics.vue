<template>
  <el-dialog v-model="visible" width="460px" destroy-on-close align-center modal-class="clean-dialog-wrapper">
    <CanvasUi :distortion="distortion" :color="difficultyColorMap.NORMAL">
      <!-- 主卡片容器 -->
      <div
        class="rounded-[36px] bg-white/95 backdrop-blur-xl p-8 text-slate-800 flex flex-col justify-between select-none border border-white/60 overflow-visible">
        <!-- 1. 顶部：难度等级展示 -->
        <div class="flex items-center justify-between pb-5 mb-2 border-b border-slate-100/80">
          <span class="text-xs font-bold tracking-widest text-slate-400">难度等级</span>
          <div class="flex items-baseline gap-1.5">
            <span class="text-4xl font-black font-mono tracking-tight text-slate-900">{{ statsData.difficulty }}</span>
          </div>
        </div>

        <!-- 2. 中间：数据统计 Grid (3列排布) -->
        <div class="grid grid-cols-3 gap-3.5 my-2">
          <div
            class="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-3.5 flex flex-col border border-slate-100 shadow-sm">
            <span class="text-[11px] font-semibold text-slate-400 mb-1">音乐时长</span>
            <div class="text-base font-extrabold font-mono text-slate-800">
              {{ statsData.duration }}
            </div>
          </div>

          <div
            class="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-3.5 flex flex-col border border-slate-100 shadow-sm">
            <span class="text-[11px] font-semibold text-slate-400 mb-1">变速范围</span>
            <div class="text-base font-extrabold font-mono text-slate-800 tracking-tight">
              {{ statsData.bpmRange }}
            </div>
          </div>

          <div
            class="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-3.5 flex flex-col border border-slate-100 shadow-sm">
            <span class="text-[11px] font-semibold text-slate-400 mb-1">总音符</span>
            <div class="text-base font-extrabold font-mono text-slate-800">
              {{ statsData.totalNotes?.toLocaleString() }}
            </div>
          </div>

          <div
            class="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-3.5 flex flex-col border border-slate-100 shadow-sm">
            <span class="text-[11px] font-semibold text-slate-400 mb-1">平均密度</span>
            <div class="text-base font-extrabold font-mono text-slate-800">
              {{ statsData.avgNps }} <span class="text-[10px] font-medium text-slate-400">/s</span>
            </div>
          </div>

          <div
            class="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-3.5 flex flex-col border border-slate-100 shadow-sm">
            <span class="text-[11px] font-semibold text-slate-400 mb-1">峰值密度</span>
            <div class="text-base font-extrabold font-mono text-slate-800">
              {{ statsData.peakNps }} <span class="text-[10px] font-medium text-slate-400">/s</span>
            </div>
          </div>

          <div
            class="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-3.5 flex flex-col border border-slate-100 shadow-sm">
            <span class="text-[11px] font-semibold text-slate-400 mb-1">高压区间</span>
            <div class="text-base font-extrabold font-mono text-slate-800">
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
  EASY: [0.22, 0.78, 0.45],       // 绿色 (简单)
  NORMAL: [0.3059, 0.5373, 1],    // 当前蓝色 (中等)
  HARD: [1.0, 0.42, 0.42],        // 淡红 (偏难)
  EXPERT: [0.82, 0.12, 0.18],      // 深红 (很难)
  MASTER: [0.45, 0.05, 0.08]       // 暗黑 (最难)
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
  highDensityDuration: '00:32'
}

// RGB 格式化函数
const toCssRgb = ([r, g, b]: number[], alpha = 1) => {
  const [r255, g255, b255] = [r, g, b].map(v => Math.round(v * 255))
  return alpha < 1
    ? `rgba(${r255}, ${g255}, ${b255}, ${alpha})`
    : `rgb(${r255}, ${g255}, ${b255})`
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