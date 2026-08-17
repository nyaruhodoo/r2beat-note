<template>
  <div class="flex flex-col gap-2 w-full max-w-90 font-sans">
    <div v-for="(item, index) in data" :key="index"
      class="relative flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100/80">
      <!-- 左侧 Label -->
      <span class="shrink-0 text-xs font-medium text-slate-400 select-none">
        {{ item.title.trim() }}
      </span>

      <!-- 右侧 快捷键组合按键 -->
      <div class="flex items-center gap-1.5 shrink-0">
        <template v-for="(key, keyIndex) in item.keys" :key="keyIndex">
          <kbd
            class="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-200 bg-white px-2 font-mono text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:text-slate-900 select-none active:translate-y-px">
            {{ formatKey(key) }}
          </kbd>
          <span v-if="keyIndex < item.keys.length - 1" class="text-xs font-medium text-slate-400 select-none">
            +
          </span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const data = [
  {
    title: '切换音频播放',
    keys: ['空格'],
  },
  { title: '撤回修改', keys: ['ctrl', 'z'] },
  {
    title: '恢复修改',
    keys: ['ctrl', 'y'],
  },
  { title: '选中障碍物', keys: ['shift', '左键'] },
  { title: '调整节拍(非组合键)', keys: ['q', 'w', 'e'] },
  { title: '调整速率(非组合键)', keys: ['a', 's', 'd'] },
]

const formatKey = (key: string) => {
  if (!key) return ''
  return key.charAt(0).toUpperCase() + key.slice(1)
}
</script>