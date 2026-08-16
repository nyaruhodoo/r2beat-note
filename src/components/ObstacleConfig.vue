<template>
  <div class="relative h-full flex flex-col">
    <div class="flex-1 overflow-y-auto pb-16">
      <el-form label-width="140px" label-position="left" size="small" class="compact-form">

        <!-- 1. 网格与视口配置 -->
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


          <el-form-item label="刻度线长度" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-input-number v-model="minorTickLengthSafe" :min="0" :max="50" :step="1" :precision="0"
                :value-on-clear="0" style="width: 100px" />
              <el-button :icon="Refresh" size="small" @click="resetField('minorTickLength')" title="重置为默认值" />
            </div>
          </el-form-item>

          <el-form-item label="Coord对准精度" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-input-number v-model="stepCoordSafe" :min="0.1" :max="100" :step="1" :value-on-clear="1"
                style="width: 100px" />
              <el-button :icon="Refresh" size="small" @click="resetField('stepCoord')" title="重置为默认值" />
            </div>
          </el-form-item>



          <!-- 修改项: 额外延迟修正(秒) -->
          <el-form-item class="prevent-item-expand">
            <template #label>
              <div class="flex items-center gap-1.5">
                <span>额外延迟修正(秒)</span>
                <el-tooltip raw-content content="因为各种原因需要采用该配置来对齐1.0编辑器的听感<br />你可以找一首你认为最准的谱子来调试<br />对大多数用户来说并不需要修改"
                  placement="top" effect="dark">
                  <el-icon
                    class="cursor-pointer text-amber-500 hover:text-amber-600 transition-transform hover:scale-110 text-base">
                    <QuestionFilled />
                  </el-icon>
                </el-tooltip>
              </div>
            </template>
            <div class="flex items-center gap-1">
              <el-input-number v-model="fixMusicDelaySafe" :min="-1" :max="1" :step="0.01" :precision="2"
                :value-on-clear="0" style="width: 100px" />
              <el-button :icon="Refresh" size="small" @click="resetField('fixMusicDelay')" title="重置为默认值" />
            </div>
          </el-form-item>
        </div>

        <el-divider class="my-2" />

        <!-- 2. 画布与颜色配置 -->
        <div class="mb-4">
          <!-- 新增项: 画布背景色 -->
          <el-form-item label="画布背景色" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-color-picker v-model="canvasBgColorHex" show-alpha color-format="hex" class="w-7 h-7" />
              <el-button :icon="Refresh" size="small" @click="resetField('canvasBgColor')" title="重置为默认值" />
            </div>
          </el-form-item>

          <!-- 新增项: 轨道背景色 -->
          <el-form-item label="轨道背景色" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-color-picker v-model="trackBgColorHex" show-alpha color-format="hex" class="w-7 h-7" />
              <el-button :icon="Refresh" size="small" @click="resetField('trackBgColor')" title="重置为默认值" />
            </div>
          </el-form-item>

          <!-- 整合后的选中背景色 (含透明度) -->
          <el-form-item label="选中背景颜色" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-color-picker v-model="selectedBgColorHex" show-alpha color-format="hex" class="w-7 h-7" />
              <el-button :icon="Refresh" size="small" @click="resetField('selectedBgColor')" title="重置为默认值" />
            </div>
          </el-form-item>

          <!-- 整合后的判定线颜色 (含透明度) -->
          <el-form-item label="判定线颜色" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-color-picker v-model="activeRowColorHex" show-alpha color-format="hex" class="w-7 h-7" />
              <el-button :icon="Refresh" size="small" @click="resetField('activeRowColor')" title="重置为默认值" />
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
              <el-color-picker v-model="gridLineColorHex" show-alpha color-format="hex" class="w-7 h-7" />
              <el-button :icon="Refresh" size="small" @click="resetField('gridLineColor')" title="重置为默认值" />
            </div>
          </el-form-item>

          <!-- 新增项: 刻度线颜色 -->
          <el-form-item label="刻度线颜色" class="prevent-item-expand">
            <div class="flex items-center gap-1">
              <el-color-picker v-model="tickColorHex" show-alpha color-format="hex" class="w-7 h-7" />
              <el-button :icon="Refresh" size="small" @click="resetField('tickColor')" title="重置为默认值" />
            </div>
          </el-form-item>

        </div>

        <el-divider class="my-2" />

        <!-- 新增项: 开启方向键映射障碍物 -->
        <el-form-item class="prevent-item-expand">
          <template #label>
            <div class="flex items-center gap-1.5">
              <span>方向键映射障碍物</span>
              <el-tooltip content="开启后可以使用方向键快速切换选择的障碍物" placement="top" effect="dark">
                <el-icon
                  class="cursor-pointer text-blue-500 hover:text-blue-600 transition-transform hover:scale-110 text-base">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </div>
          </template>
          <div class="flex items-center gap-1">
            <el-switch v-model="store.directionKeyMap" size="small" />
            <el-button :icon="Refresh" size="small" @click="resetField('directionKeyMap')" title="重置为默认值" />
          </div>
        </el-form-item>
      </el-form>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Refresh, QuestionFilled } from '@element-plus/icons-vue'
import { useGlobalConfigStore, defaultGlobalConfig } from '@/store/global-config'

const store = useGlobalConfigStore()

/**
 * 32位无符号整数 (如 0xffffffff) 与 8位 Hex 字符串 ("#ffffffff") 互转方法
 * 存储结构: 0xRRGGBBAA (前6位RGB, 后2位Alpha)
 */
const numberToHex8Str = (num: number): string => {
  // >>> 0 强制转为 32 位无符号整型，防止负数转换异常
  const hex = (num >>> 0).toString(16).padStart(8, '0')
  return '#' + hex
}

const hex8StrToNumber = (hex: string | null): number => {
  if (!hex) return 0
  const cleanHex = hex.replace('#', '')
  // 如果输入的是 6 位 Hex (#RRGGBB)，补齐 Alpha 值为 FF (不透明)
  const fullHex = cleanHex.length === 6 ? cleanHex + 'ff' : cleanHex
  return parseInt(fullHex, 16) >>> 0
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

// 安全数字计算属性
const visibleGridCountSafe = createSafeNumericComputed('visibleGridCount', 1, 200, 10)
const activeRowIndexFromBottomSafe = createSafeNumericComputed('activeRowIndexFromBottom', 0, store.visibleGridCount, 0)
const scrollbarWidthSafe = createSafeNumericComputed('scrollbarWidth', 0, 50, 10)
const minorTickLengthSafe = createSafeNumericComputed('minorTickLength', 0, 50, 5)
const stepCoordSafe = createSafeNumericComputed('stepCoord', 0.1, 100, 1)
const fixMusicDelaySafe = createSafeNumericComputed('fixMusicDelay', -1, 1, 0)

// 工厂函数：创建支持 8位Hex (#RRGGBBAA) 绑定的 Color Computed
const createColorComputed = (key: keyof typeof store) => {
  return computed<string>({
    get: () => numberToHex8Str(store[key] as number),
    set: (val: string | null) => {
      if (val) {
        ; (store[key] as number) = hex8StrToNumber(val)
      }
    },
  })
}

// 颜色绑定列表 (均支持透明度 0xRRGGBBAA)
const activeRowColorHex = createColorComputed('activeRowColor')
const gridLineColorHex = createColorComputed('gridLineColor')
const selectedBgColorHex = createColorComputed('selectedBgColor')
const canvasBgColorHex = createColorComputed('canvasBgColor') // 新增
const trackBgColorHex = createColorComputed('trackBgColor')   // 新增
const tickColorHex = createColorComputed('tickColor')         // 新增

// 重置单项配置为默认值
const resetField = (key: keyof typeof defaultGlobalConfig) => {
  store.$patch({ [key]: defaultGlobalConfig[key] })
}
</script>