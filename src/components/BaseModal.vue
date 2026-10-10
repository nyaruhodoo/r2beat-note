<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    align-center
    append-to-body
    destroy-on-close
    class="bpm-edit-dialog flex max-h-[95vh] max-w-[95vw] flex-col overflow-hidden rounded-2xl"
    @update:model-value="handleClose"
    @open="$emit('open')"
  >
    <!-- 内容默认插槽 -->
    <slot />

    <!-- 底部按钮操作区域 -->
    <template #footer>
      <div class="flex items-center justify-end gap-2 pt-2">
        <!-- 取消按钮插槽 (默认内置取消按钮样式) -->
        <slot name="cancel">
          <button
            type="button"
            class="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
            @click="handleClose(false)"
          >
            {{ cancelText }}
          </button>
        </slot>

        <!-- 确认按钮插槽 (默认内置确认按钮样式) -->
        <slot name="confirm">
          <button
            type="button"
            class="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all duration-200 hover:bg-slate-800 hover:ring-1 hover:shadow-slate-500/20 hover:ring-slate-700/50 hover:brightness-125 active:scale-95"
            @click="$emit('confirm')"
          >
            {{ confirmText }}
          </button>
        </slot>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    width?: string
    cancelText?: string
    confirmText?: string
  }>(),
  {
    title: '',
    width: '640px',
    cancelText: '取消',
    confirmText: '保存修改',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'open'): void
  (e: 'confirm'): void
}>()

const handleClose = (val: boolean) => {
  emit('update:modelValue', val)
}
</script>

<style>
.el-dialog__body {
  flex: 1;
  overflow: auto;
}
</style>
