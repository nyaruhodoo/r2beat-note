<template>
  <div class="rounded-xl bg-slate-50 p-3">
    <div class="flex items-center justify-between">
      <span class="block text-xs font-medium text-slate-400">{{ label }}</span>

      <!-- 编辑 / 确认 / 自定义图标按钮（保持常显） -->
      <button v-if="showEditButton" type="button" class="text-slate-400 transition-colors hover:text-slate-600"
        :title="isEditing ? `保存${label}` : `编辑${label}`" @click="handleClick">
        <!-- 如果有自定义点击事件（如打开弹窗），显示默认编辑图标 -->
        <template v-if="customEditAction">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </template>
        <!-- 默认输入框模式：平滑切换编辑与对勾图标 -->
        <template v-else>
          <svg v-if="!isEditing" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"
            viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <svg v-else class="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5"
            viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </template>
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="mt-1">
      <template v-if="showEditButton && !customEditAction">
        <input ref="inputRef" v-model="internalValue" :type="inputType" :readonly="!isEditing"
          class="w-full [appearance:textfield] rounded font-mono text-sm font-semibold text-slate-700 transition-all focus:outline-hidden [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          :class="isEditing
              ? 'border border-slate-300 bg-white px-1.5 py-0.5 text-slate-800 shadow-xs focus:border-slate-500'
              : 'border-transparent bg-transparent p-0 select-none'
            " :title="String(internalValue)" @keydown.enter="submitChange" @keydown.esc="cancelEdit"
          @blur="handleBlur" />
      </template>
      <template v-else>
        <span class="block font-mono text-sm font-semibold text-slate-700 select-none">
          <slot>{{ internalValue }}</slot>
        </span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    modelValue: string | number
    showEditButton?: boolean
    inputType?: 'text' | 'number'
    customEditAction?: () => void
  }>(),
  {
    showEditButton: false,
    inputType: 'text',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: any): void
  (e: 'save', val: any): void
}>()

const isEditing = ref(false)
const internalValue = ref(props.modelValue)
const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.modelValue,
  (val) => {
    if (!isEditing.value) {
      internalValue.value = val
    }
  },
)

const handleClick = () => {
  if (props.customEditAction) {
    props.customEditAction()
    return
  }

  if (isEditing.value) {
    submitChange()
  } else {
    isEditing.value = true
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.select()
    })
  }
}

const submitChange = () => {
  if (!isEditing.value) return
  isEditing.value = false
  emit('update:modelValue', internalValue.value)
  emit('save', internalValue.value)
}

const cancelEdit = () => {
  internalValue.value = props.modelValue
  isEditing.value = false
}

const handleBlur = () => {
  submitChange()
}
</script>
