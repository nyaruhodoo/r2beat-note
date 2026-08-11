<template>
  <div class="relative h-full flex flex-col">
    <div class="flex-1 overflow-y-auto pb-16">
      <!-- 添加 size="small"，调小 label-width，减少内部 gap -->
      <el-form label-width="120px" label-position="left" size="small" class="compact-form">
        <!-- 2. 网格与视口配置 -->
        <div class="mb-4">
          <el-form-item label="视口可见总行数" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-input-number v-model="visibleGridCountSafe" :min="1" :max="200" :step="1" :precision="0"
                :value-on-clear="1" style="width: 100px" />
              <el-button :icon="Refresh" size="small" @click="resetField('visibleGridCount')" title="重置为默认值" />
            </div>
          </el-form-item>
          <el-form-item label="判定线距离底部行数" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-input-number v-model="activeRowIndexFromBottomSafe" :min="0" :max="store.visibleGridCount" :step="1"
                :precision="0" :value-on-clear="0" style="width: 100px" />
              <el-button :icon="Refresh" size="small" @click="resetField('activeRowIndexFromBottom')" title="重置为默认值" />
            </div>
          </el-form-item>
          <el-form-item label="滚动条宽度" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-input-number v-model="scrollbarWidthSafe" :min="0" :max="50" :step="1" :precision="0"
                :value-on-clear="0" style="width: 100px" />
              <el-button :icon="Refresh" size="small" @click="resetField('scrollbarWidth')" title="重置为默认值" />
            </div>
          </el-form-item>

          <el-form-item label="网格渲染精度" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-input-number v-model="stepCoordSafe" :min="0.1" :max="100" :step="1" :value-on-clear="1"
                style="width: 100px" />
              <el-button :icon="Refresh" size="small" @click="resetField('stepCoord')" title="重置为默认值" />
            </div>
          </el-form-item>

          <!-- 新增：音乐延迟修正 -->
          <el-form-item label="额外延迟修正(秒)" class="prevent-item-expand" title="如果你不知道有什么用请不要改">
            <div class="flex items-center gap-1">
              <el-input-number v-model="fixMusicDelaySafe" :min="-0.1" :max="0.1" :step="0.01" :precision="2"
                :value-on-clear="0" style="width: 100px" />
              <el-button :icon="Refresh" size="small" @click="resetField('fixMusicDelay')" title="重置为默认值" />
            </div>
          </el-form-item>
        </div>

        <el-divider class="my-2" />

        <!-- 4. 选中态样式配置 -->
        <div class="mb-4">
          <el-form-item label="选中背景颜色" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-color-picker v-model="selectedBgColorHex" :show-alpha="false" class="w-7 h-7" />
              <el-button :icon="Refresh" size="small" @click="resetField('selectedBgColor')" title="重置为默认值" />
            </div>
          </el-form-item>
          <el-form-item label="选中背景透明度" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-input-number v-model="selectedBgAlphaSafe" :min="0" :max="1" :step="0.05" :precision="2"
                :value-on-clear="0" style="width: 100px" />
              <el-button :icon="Refresh" size="small" @click="resetField('selectedBgAlpha')" title="重置为默认值" />
            </div>
          </el-form-item>
        </div>

        <div class="mb-4">
          <el-form-item label="判定线颜色" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-color-picker v-model="activeRowColorHex" :show-alpha="false" class="w-7 h-7" />
              <el-button :icon="Refresh" size="small" @click="resetField('activeRowColor')" title="重置为默认值" />
            </div>
          </el-form-item>
          <el-form-item label="判定线透明度" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-input-number v-model="activeRowAlphaSafe" :min="0" :max="1" :step="0.05" :precision="2"
                :value-on-clear="0" style="width: 100px" />
              <el-button :icon="Refresh" size="small" @click="resetField('activeRowAlpha')" title="重置为默认值" />
            </div>
          </el-form-item>
          <el-form-item label="显示背景网格线" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-switch v-model="store.showGridLines" size="small" />
              <el-button :icon="Refresh" size="small" @click="resetField('showGridLines')" title="重置为默认值" />
            </div>
          </el-form-item>
          <el-form-item label="网格线颜色" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-color-picker v-model="gridLineColorHex" :show-alpha="false" class="w-7 h-7" />
              <el-button :icon="Refresh" size="small" @click="resetField('gridLineColor')" title="重置为默认值" />
            </div>
          </el-form-item>
          <el-form-item label="刻度线长度" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-input-number v-model="minorTickLengthSafe" :min="0" :max="50" :step="1" :precision="0"
                :value-on-clear="0" style="width: 100px" />
              <el-button :icon="Refresh" size="small" @click="resetField('minorTickLength')" title="重置为默认值" />
            </div>
          </el-form-item>
        </div>

      </el-form>
    </div>

    <!-- 重置全部按钮也调小 -->
    <el-button type="primary" plain class="absolute bottom-4 right-4" @click="resetAll">
      <el-icon>
        <Refresh />
      </el-icon>
      重置全部
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { useGlobalConfigStore, defaultGlobalConfig } from '@/store/global-config'

const store = useGlobalConfigStore()

// 16进制数字 (如 0xffffff) 与字符串 ("#ffffff") 互转方法
const numberToHexStr = (num: number): string => {
  return '#' + num.toString(16).padStart(6, '0')
}

const hexStrToNumber = (hex: string | null): number => {
  if (!hex) return 0
  return parseInt(hex.replace('#', ''), 16)
}

// 安全的数字校验转换函数
const sanitizeNumber = (val: unknown, min: number, max: number, fallback: number): number => {
  if (val === undefined || val === null || typeof val !== 'number' || Number.isNaN(val)) {
    return fallback
  }
  return Math.min(Math.max(val, min), max)
}

// 动态创建带有安全过滤的 Computed 绑定
const createSafeNumericComputed = (
  key: keyof typeof store,
  min: number,
  max: number,
  fallback: number
) => {
  return computed<number>({
    get: () => sanitizeNumber(store[key] as number, min, max, fallback),
    set: (val: number | undefined) => {
      if (val !== undefined && val !== null && !Number.isNaN(val)) {
        const clampedVal = Math.min(Math.max(val, min), max)
          ; (store[key] as number) = clampedVal
      }
    },
  })
}

// 安全计算属性列表
const activeRowAlphaSafe = createSafeNumericComputed('activeRowAlpha', 0, 1, 0.5)
const visibleGridCountSafe = createSafeNumericComputed('visibleGridCount', 1, 200, 10)
const activeRowIndexFromBottomSafe = createSafeNumericComputed('activeRowIndexFromBottom', 0, store.visibleGridCount, 0)
const scrollbarWidthSafe = createSafeNumericComputed('scrollbarWidth', 0, 50, 10)
const minorTickLengthSafe = createSafeNumericComputed('minorTickLength', 0, 50, 5)
const stepCoordSafe = createSafeNumericComputed('stepCoord', 0.1, 100, 1)
const selectedBgAlphaSafe = createSafeNumericComputed('selectedBgAlpha', 0, 1, 0.2)
// 新增：音乐延迟修正安全计算属性 (-1 到 1，步幅 0.01，默认值 0)
const fixMusicDelaySafe = createSafeNumericComputed('fixMusicDelay', -1, 1, 0)

// 颜色绑定
const activeRowColorHex = computed({
  get: () => numberToHexStr(store.activeRowColor),
  set: (val: string) => { store.activeRowColor = hexStrToNumber(val) },
})

const gridLineColorHex = computed({
  get: () => numberToHexStr(store.gridLineColor),
  set: (val: string) => { store.gridLineColor = hexStrToNumber(val) },
})

const selectedBgColorHex = computed({
  get: () => numberToHexStr(store.selectedBgColor),
  set: (val: string) => { store.selectedBgColor = hexStrToNumber(val) },
})

// 重置单项配置为默认值
const resetField = (key: keyof typeof defaultGlobalConfig) => {
  store.$patch({ [key]: defaultGlobalConfig[key] })
}

// 重置全部配置为默认值
const resetAll = () => {
  store.$patch(defaultGlobalConfig)
}
</script>

<style scoped>
/* 可保留原有样式，也可添加 flex 对齐辅助类（已在模板中使用） */
</style>