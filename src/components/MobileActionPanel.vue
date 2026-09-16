<template>
  <div class="flex w-full flex-col gap-4 p-4 font-sans select-none">
    <!-- 1. 播放与核心控制区 -->
    <div class="flex flex-col gap-2">
      <div class="grid grid-cols-2 gap-2">
        <el-button
          type="primary"
          plain
          class="flex items-center justify-center gap-1.5"
          @click="emitEvent('toggle-play')"
        >
          切换播放
        </el-button>
        <el-button
          plain
          class="flex items-center justify-center gap-1.5"
          @click="emitEvent('toggle-scale')"
        >
          切换刻度显示
        </el-button>
      </div>

      <!-- 时间轴微调与快进/快退 -->
      <div class="grid grid-cols-2 gap-2">
        <el-button
          plain
          class="flex items-center justify-center gap-1.5"
          @click="emitEvent('step-backward')"
        >
          后退
        </el-button>
        <el-button
          plain
          class="flex items-center justify-center gap-1.5"
          @click="emitEvent('step-forward')"
        >
          前进
        </el-button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <el-button plain class="flex items-center justify-center gap-1.5" @click="seekByOffset(-3)">
          后退 3 秒
        </el-button>
        <el-button plain class="flex items-center justify-center gap-1.5" @click="seekByOffset(3)">
          前进 3 秒
        </el-button>
      </div>
    </div>

    <el-divider class="my-1" />

    <!-- 2. 编辑历史区 (撤回 / 恢复) -->
    <div class="flex flex-col gap-2">
      <div class="grid grid-cols-2 gap-2">
        <el-button
          plain
          class="flex items-center justify-center gap-1.5"
          @click="emitEvent('undo')"
        >
          撤回修改
        </el-button>
        <el-button
          plain
          class="flex items-center justify-center gap-1.5"
          @click="emitEvent('redo')"
        >
          恢复修改
        </el-button>
      </div>
    </div>

    <el-divider class="my-1" />

    <!-- 3. 放置与清空操作区 -->
    <div class="flex flex-col gap-2">
      <!-- 基础放置/清空 -->
      <div class="grid grid-cols-2 gap-2">
        <el-button
          plain
          class="flex items-center justify-center gap-1.5"
          @click="emitEvent('place-obstacle')"
        >
          放置
        </el-button>
        <el-button
          type="danger"
          plain
          class="flex items-center justify-center gap-1.5"
          @click="emitEvent('clear-obstacle')"
        >
          清空
        </el-button>
      </div>

      <!-- 触屏放置/清空 切换模式 -->
      <div class="grid grid-cols-1 gap-2">
        <el-button
          :type="touchMode === 'add' ? 'success' : 'info'"
          plain
          class="flex items-center justify-center gap-1.5"
          @click="toggleTouchMode"
        >
          触屏模式: {{ touchMode === 'add' ? '触屏放置' : '触屏清空' }}
        </el-button>
      </div>
    </div>

    <el-divider class="my-1" />

    <!-- 4. 节拍控制区 -->
    <div class="flex flex-col gap-2">
      <div class="grid grid-cols-3 gap-2">
        <el-button plain class="" @click="emitEvent('decrease-beat')"> 降低节拍 </el-button>
        <el-button type="warning" plain class="" @click="emitEvent('reset-beat')"> 重置 </el-button>
        <el-button plain class="" @click="emitEvent('increase-beat')"> 增加节拍 </el-button>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <el-button plain class="" @click="emitEvent('decrease-speed')">降低速率 </el-button>
        <el-button type="warning" plain class="" @click="emitEvent('reset-speed')">
          重置
        </el-button>
        <el-button plain class="" @click="emitEvent('increase-speed')">增加速率</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  // 按照 handleSeekToEvent 约定的对象或数组结构派发 seekTo 事件
  emitter.emit('seekTo', { target: targetTime, type: 'time' })
}

// 统一的事件派发方法
const emitEvent = (eventName: ShortcutEvents, payLoad?: any) => {
  console.log(`[移动端控件触发] 事件: ${eventName}`)
  emitter.emit(eventName, payLoad)
}
</script>
