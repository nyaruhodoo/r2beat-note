<template>
  <div class="flex w-full max-w-90 flex-col gap-2 font-sans select-none">
    <div
      v-for="(item, index) in shortcutKey"
      :key="item.event"
      class="group relative flex items-center justify-between gap-2 rounded-xl p-3 transition-all"
      :class="[
        item.lock
          ? 'cursor-not-allowed bg-slate-100/60 opacity-60'
          : 'cursor-pointer bg-slate-50 hover:bg-slate-100/80',
      ]"
      @click="startRecording(index)"
    >
      <!-- 左侧 Label 与锁图标 -->
      <div class="flex shrink-0 items-center gap-1.5 overflow-hidden">
        <span class="truncate text-xs font-medium text-slate-500">
          {{ item.title.trim() }}
        </span>
        <!-- 锁定图标 -->
        <svg
          v-if="item.lock"
          class="h-3.5 w-3.5 shrink-0 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>

      <!-- 右侧 快捷键组合按键 -->
      <div class="flex shrink-0 items-center gap-1.5">
        <template v-if="item.keys && item.keys.length > 0">
          <template v-for="(key, keyIndex) in item.keys" :key="keyIndex">
            <kbd
              class="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-200 bg-white px-2 font-mono text-xs font-semibold text-slate-700 shadow-xs transition-colors"
              :class="{ 'group-hover:border-slate-300 group-hover:text-slate-900': !item.lock }"
            >
              {{ formatKey(key) }}
            </kbd>
            <span v-if="keyIndex < item.keys.length - 1" class="text-xs font-medium text-slate-400">
              +
            </span>
          </template>
        </template>
        <span
          v-else
          class="inline-flex h-6 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-100/50 px-2 text-[11px] font-normal text-slate-400"
          :class="{ 'group-hover:border-slate-300': !item.lock }"
        >
          未设置
        </span>
      </div>

      <!-- 点击修改时的蒙层 Overlay (锁定项目不展示) -->
      <div
        v-if="!item.lock && activeIndex === index"
        class="absolute inset-0 z-10 flex items-center justify-between rounded-xl border border-indigo-500 bg-indigo-600/90 px-3 text-white shadow-md backdrop-blur-xs transition-all"
        @click.stop
      >
        <div class="flex items-center gap-1.5 overflow-hidden">
          <span class="shrink-0 text-xs font-medium text-indigo-100">按下新快捷键:</span>

          <div class="flex items-center gap-1 overflow-x-auto">
            <template v-if="recordedKeys.length">
              <template v-for="(key, kIdx) in recordedKeys" :key="kIdx">
                <kbd
                  class="inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/30 bg-white/20 px-1.5 font-mono text-[11px] font-bold text-white"
                >
                  {{ formatKey(key) }}
                </kbd>
                <span v-if="kIdx < recordedKeys.length - 1" class="text-[10px] text-indigo-200"
                  >+</span
                >
              </template>
            </template>
            <span v-else class="animate-pulse text-xs text-indigo-200">等待输入...</span>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <button
            class="cursor-pointer text-[11px] font-medium text-indigo-200 transition-colors hover:text-white"
            title="清空当前快捷键"
            @click.stop="clearShortcut"
          >
            清除
          </button>
          <button
            class="cursor-pointer text-[11px] font-medium text-indigo-200 transition-colors hover:text-white"
            title="恢复默认值"
            @click.stop="resetShortcut"
          >
            恢复
          </button>
          <button
            class="cursor-pointer text-[11px] font-medium text-indigo-200 transition-colors hover:text-white"
            title="确认保存 (Enter)"
            @click.stop="saveShortcut"
          >
            确定
          </button>
          <button
            class="cursor-pointer text-[11px] font-medium text-indigo-200 transition-colors hover:text-white"
            title="取消 (Esc)"
            @click.stop="stopRecording"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted } from 'vue'

import { useGlobalConfigStore, defaultGlobalConfig } from '@/store/global-config'
import { emitter } from '@/utils/eventBus'

export interface ShortcutItem {
  title: string
  keys: string[]
  event: string
  lock?: boolean
}

const globalConfigStore = useGlobalConfigStore()
const { shortcutKey } = storeToRefs(globalConfigStore)

const activeIndex = ref<number | null>(null)
const recordedKeys = ref<string[]>([])

const formatKey = (key: string) => {
  if (!key) return ''
  const lower = key.toLowerCase()
  const map: Record<string, string> = {
    // 修饰键与鼠标
    control: 'Ctrl',
    ctrl: 'Ctrl',
    shift: 'Shift',
    alt: 'Alt',
    meta: 'Cmd',
    mouseleft: '鼠标左键',
    mouseright: '鼠标右键',
    mousemiddle: '鼠标中键',

    // 常用功能键中文映射
    space: '空格',
    enter: '回车',
    backspace: '退格',
    delete: '删除',
    tab: 'Tab',
    escape: 'Esc',
    capslock: '大写锁定',

    // 方向键
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',

    // 翻页与定位
    pageup: '上页',
    pagedown: '下页',
    home: 'Home',
    end: 'End',
    insert: '插入',
  }
  return map[lower] || (key.length === 1 ? key.toUpperCase() : key)
}

// 阻止事件继续向全局/其他监听器传播
const interceptEvent = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()
}

// 开启蒙层录制模式（如果已被锁定，则直接禁止开启）
const startRecording = (index: number) => {
  if (shortcutKey.value[index]?.lock) return

  activeIndex.value = index
  recordedKeys.value = [...shortcutKey.value[index].keys]

  removeGlobalShortcutListeners()

  window.addEventListener('keydown', handleKeyDown, true)
  window.addEventListener('keyup', handleKeyUp, true)
  window.addEventListener('mousedown', handleMouseDown, true)
  window.addEventListener('contextmenu', handleContextMenu, true)
}

// 停止录制模式
const stopRecording = () => {
  activeIndex.value = null
  recordedKeys.value = []

  window.removeEventListener('keydown', handleKeyDown, true)
  window.removeEventListener('keyup', handleKeyUp, true)
  window.removeEventListener('mousedown', handleMouseDown, true)
  window.removeEventListener('contextmenu', handleContextMenu, true)

  initGlobalShortcutListeners()
}

// 清空当前项的快捷键（设为空数组）
const clearShortcut = () => {
  if (activeIndex.value === null) return
  shortcutKey.value[activeIndex.value].keys = []
  stopRecording()
}

// 重置当前项为默认快捷键
const resetShortcut = () => {
  if (activeIndex.value === null) return

  const currentEvent = shortcutKey.value[activeIndex.value].event
  const defaultConfigItem = defaultGlobalConfig.shortcutKey.find(
    (item) => item.event === currentEvent,
  )

  if (defaultConfigItem) {
    shortcutKey.value[activeIndex.value].keys = [...defaultConfigItem.keys]
  }

  stopRecording()
}

// 保存修改后的快捷键（允许保存空数组，即代表取消）
const saveShortcut = () => {
  if (activeIndex.value === null) return

  shortcutKey.value[activeIndex.value].keys = [...recordedKeys.value]
  stopRecording()
}

// ----------------------------------------------------
// 录制状态下的事件处理
// ----------------------------------------------------
const handleKeyDown = (e: KeyboardEvent) => {
  interceptEvent(e)

  if (e.key === 'Enter') {
    saveShortcut()
    return
  }
  if (e.key === 'Escape') {
    stopRecording()
    return
  }

  const keys: string[] = []
  if (e.ctrlKey) keys.push('Control')
  if (e.shiftKey) keys.push('Shift')
  if (e.altKey) keys.push('Alt')
  if (e.metaKey) keys.push('Meta')

  const mainKey = e.key
  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(mainKey)) {
    const keyVal =
      mainKey === ' ' ? 'Space' : mainKey.length === 1 ? mainKey.toLowerCase() : mainKey
    if (!keys.includes(keyVal)) {
      keys.push(keyVal)
    }
  }

  recordedKeys.value = keys
}

const handleKeyUp = (e: KeyboardEvent) => {
  interceptEvent(e)
}

const handleMouseDown = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target && target.closest('button')) {
    return
  }

  interceptEvent(e)

  const mouseKeyMap: Record<number, string> = {
    0: 'MouseLeft',
    1: 'MouseMiddle',
    2: 'MouseRight',
  }

  const mouseKey = mouseKeyMap[e.button]
  if (!mouseKey) return

  const keys: string[] = []
  if (e.ctrlKey) keys.push('Control')
  if (e.shiftKey) keys.push('Shift')
  if (e.altKey) keys.push('Alt')
  if (e.metaKey) keys.push('Meta')

  if (!keys.includes(mouseKey)) {
    keys.push(mouseKey)
  }

  recordedKeys.value = keys
}

const handleContextMenu = (e: MouseEvent) => {
  interceptEvent(e)
}

// ----------------------------------------------------
// 全局快捷键派发逻辑 (非录制状态)
// ----------------------------------------------------
const handleGlobalKeyDown = (e: KeyboardEvent) => {
  const activeElement = document.activeElement
  if (
    activeElement &&
    (activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).isContentEditable)
  ) {
    return
  }

  const currentPressedKeys: string[] = []
  if (e.ctrlKey) currentPressedKeys.push('Control')
  if (e.shiftKey) currentPressedKeys.push('Shift')
  if (e.altKey) currentPressedKeys.push('Alt')
  if (e.metaKey) currentPressedKeys.push('Meta')

  const mainKey = e.key
  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(mainKey)) {
    const keyVal =
      mainKey === ' ' ? 'Space' : mainKey.length === 1 ? mainKey.toLowerCase() : mainKey
    if (!currentPressedKeys.includes(keyVal)) {
      currentPressedKeys.push(keyVal)
    }
  }

  for (const item of shortcutKey.value) {
    // 如果没有绑定快捷键或已锁定，跳过
    if (item.lock || !item.keys || item.keys.length === 0) continue

    if (isKeyMatch(item.keys, currentPressedKeys)) {
      if (item.event === 'toggle-play') {
        e.preventDefault()
      }
      console.log(`[快捷键触发] 事件: ${item.event}, 标题: ${item.title}`, currentPressedKeys)
      emitter.emit(item.event as any)
      break
    }
  }
}

const handleGlobalMouseDown = (e: MouseEvent) => {
  const activeElement = document.activeElement
  if (
    activeElement &&
    (activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).isContentEditable)
  ) {
    return
  }

  const mouseKeyMap: Record<number, string> = {
    0: 'MouseLeft',
    1: 'MouseMiddle',
    2: 'MouseRight',
  }
  const mouseKey = mouseKeyMap[e.button]
  if (!mouseKey) return

  const currentPressedKeys: string[] = []
  if (e.ctrlKey) currentPressedKeys.push('Control')
  if (e.shiftKey) currentPressedKeys.push('Shift')
  if (e.altKey) currentPressedKeys.push('Alt')
  if (e.metaKey) currentPressedKeys.push('Meta')

  if (!currentPressedKeys.includes(mouseKey)) {
    currentPressedKeys.push(mouseKey)
  }

  for (const item of shortcutKey.value) {
    // 如果没有绑定快捷键或已锁定，跳过
    if (item.lock || !item.keys || item.keys.length === 0) continue

    if (isKeyMatch(item.keys, currentPressedKeys)) {
      console.log(`[快捷键触发] 事件: ${item.event}, 标题: ${item.title}`, currentPressedKeys)
      emitter.emit(item.event as any)
      break
    }
  }
}

const isKeyMatch = (configuredKeys: string[], pressedKeys: string[]) => {
  if (configuredKeys.length !== pressedKeys.length) return false
  const sortedConfig = [...configuredKeys].map((k) => k.toLowerCase()).sort()
  const sortedPressed = [...pressedKeys].map((k) => k.toLowerCase()).sort()
  return sortedConfig.every((val, idx) => val === sortedPressed[idx])
}

const initGlobalShortcutListeners = () => {
  window.addEventListener('keydown', handleGlobalKeyDown)
  window.addEventListener('mousedown', handleGlobalMouseDown)
}

const removeGlobalShortcutListeners = () => {
  window.removeEventListener('keydown', handleGlobalKeyDown)
  window.removeEventListener('mousedown', handleGlobalMouseDown)
}

onMounted(() => {
  initGlobalShortcutListeners()
})

onUnmounted(() => {
  stopRecording()
  removeGlobalShortcutListeners()
})
</script>
