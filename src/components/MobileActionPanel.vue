<template>
  <div class="mobile-action-panel flex w-full flex-col gap-1.5 p-1 font-sans text-xs select-none">
    <!-- 1. 核心操作区：放置与清空（放大显眼） -->
    <div class="grid grid-cols-2 gap-1.5">
      <el-button
        type="success"
        class="h-10! rounded-lg! text-sm font-medium"
        @click="emitEvent('place-obstacle')"
      >
        <el-icon class="mr-1 text-base"><Plus /></el-icon>放置
      </el-button>
      <el-button
        type="danger"
        class="h-10! rounded-lg! text-sm font-medium"
        @click="emitEvent('clear-obstacle')"
      >
        <el-icon class="mr-1 text-base"><Delete /></el-icon>清空
      </el-button>
    </div>

    <!-- 2. 播放与时间微调 -->
    <div class="grid grid-cols-4 gap-1.5">
      <el-button
        type="primary"
        class="col-span-4 h-9! rounded-lg! font-medium"
        @click="emitEvent('toggle-play')"
      >
        <el-icon class="mr-1 text-base"><VideoPlay /></el-icon>
        切换播放
      </el-button>

      <el-button class="h-8! rounded-lg!" @click="seekByOffset(-3)">
        <el-icon class="mr-0.5"><DArrowLeft /></el-icon>-3s
      </el-button>
      <el-button class="h-8! rounded-lg!" @click="emitEvent('step-backward')">
        <el-icon class="mr-0.5"><ArrowLeft /></el-icon>微退
      </el-button>
      <el-button class="h-8! rounded-lg!" @click="emitEvent('step-forward')">
        微进<el-icon class="ml-0.5"><ArrowRight /></el-icon>
      </el-button>
      <el-button class="h-8! rounded-lg!" @click="seekByOffset(3)">
        +3s<el-icon class="ml-0.5"><DArrowRight /></el-icon>
      </el-button>
    </div>

    <!-- 3. 编辑历史与触屏模式 -->
    <div class="grid grid-cols-4 gap-1.5">
      <el-button class="col-span-2 h-8! rounded-lg!" @click="emitEvent('undo')">
        <el-icon class="mr-0.5"><RefreshLeft /></el-icon>撤回
      </el-button>
      <el-button class="col-span-2 h-8! rounded-lg!" @click="emitEvent('redo')">
        <el-icon class="mr-0.5"><RefreshRight /></el-icon>恢复
      </el-button>

      <!-- 触屏模式切换 -->
      <el-button
        :type="touchMode === 'add' ? 'success' : 'warning'"
        plain
        class="col-span-4 h-8.5! rounded-lg! font-medium"
        @click="toggleTouchMode"
      >
        <el-icon class="mr-1"><Pointer /></el-icon>
        模式：{{ touchMode === 'add' ? '触屏放置' : '触屏清空' }}
      </el-button>
    </div>

    <!-- 4. 节拍控制 -->
    <div class="grid grid-cols-3 gap-1.5">
      <el-button class="h-8! rounded-lg!" @click="emitEvent('decrease-beat')">减少节拍</el-button>
      <el-button type="info" text bg class="h-8! rounded-lg!" @click="emitEvent('reset-beat')"
        >重置节拍</el-button
      >
      <el-button class="h-8! rounded-lg!" @click="emitEvent('increase-beat')">增加节拍</el-button>
    </div>

    <!-- 5. 速率控制 -->
    <div class="grid grid-cols-3 gap-1.5">
      <el-button class="h-8! rounded-lg!" @click="emitEvent('decrease-speed')">减少速率</el-button>
      <el-button type="info" text bg class="h-8! rounded-lg!" @click="emitEvent('reset-speed')"
        >重置速率</el-button
      >
      <el-button class="h-8! rounded-lg!" @click="emitEvent('increase-speed')">增加速率</el-button>
    </div>

    <!-- 6. 底部次要控制 -->
    <div class="grid grid-cols-1 gap-1.5">
      <el-button class="h-8! rounded-lg!" @click="emitEvent('toggle-scale')">
        <el-icon class="mr-1"><ScaleToOriginal /></el-icon>
        刻度显示
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  VideoPlay,
  ScaleToOriginal,
  ArrowLeft,
  ArrowRight,
  DArrowLeft,
  DArrowRight,
  RefreshLeft,
  RefreshRight,
  Plus,
  Delete,
  Pointer,
} from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/store/store'
import { emitter, type ShortcutEvents } from '@/utils/eventBus'

const appStore = useAppStore()
const { currentSongInfo, touchMode } = storeToRefs(appStore)

// 切换触屏模式 (add <-> delete)
const toggleTouchMode = () => {
  touchMode.value = touchMode.value === 'add' ? 'delete' : 'add'
}

// 时间前进 / 后退 offset 秒
const seekByOffset = (offset: number) => {
  const currentTime = currentSongInfo.value?.currentTime ?? 0
  const targetTime = Math.max(0, currentTime + offset)
  emitter.emit('seekTo', { target: targetTime, type: 'time' })
}

// 统一的事件派发方法
const emitEvent = (eventName: ShortcutEvents, payLoad?: unknown) => {
  console.log(`[移动端控件触发] 事件: ${eventName}`)
  emitter.emit(eventName, payLoad)
}
</script>

<style scoped>
.mobile-action-panel :deep(.el-button) {
  font-size: 12px;
  margin-left: 0 !important;
}
</style>
