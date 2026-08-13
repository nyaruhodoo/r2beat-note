import { defineStore } from 'pinia'

/**
 * 视轨与音轨渲染的全量动态配置接口
 */
export interface GlobalConfig {
  /** 激活行/当前演奏线的十六进制颜色 (例如: 0xffffff 为白色) */
  activeRowColor: number
  /** 激活行/当前演奏线的透明度 (范围: 0.0 ~ 1.0) */
  activeRowAlpha: number
  /** 是否在背景中显示网格辅助线 (true: 显示, false: 隐藏) */
  showGridLines: boolean
  /** 视口范围内可见的网格总行数/总划分数 (控制网格缩放与纵向密度) */
  visibleGridCount: number
  /** 激活行/判定线距离底部的网格行数位置 (决定判定线在屏幕下方的位置高度) */
  activeRowIndexFromBottom: number
  /** 次要刻度线/小节内部微调刻度线的绘制长度 (PX) */
  minorTickLength: number
  /** 基础步长坐标单位 (通常代表 1 个细分网格或基本拍子的逻辑坐标长度) */
  stepCoord: number

  /** 处于选中/高亮状态下的障碍物或音符块的背景颜色 (例如: 0x3b82f6 为蓝色) */
  selectedBgColor: number
  /** 处于选中/高亮状态下的障碍物或音符块的背景透明度 (范围: 0.0 ~ 1.0) */
  selectedBgAlpha: number

  /** 滚动条宽度 */
  scrollbarWidth: number

  /** 网格线颜色 */
  gridLineColor: number

  /** 音乐总音量 */
  musicVolume: number

  // 人工修正歌曲延迟
  fixMusicDelay: number

  // 允许的随机障碍物类型
  randomType: number[]

  // 随机障碍物重复概率取值0-100
  repeatChance: number
}

export const defaultGlobalConfig = {
  // ---- 激活行 / 判定线配置 ----
  activeRowColor: 0xffffff,
  activeRowAlpha: 1,

  // ---- 网格与视口配置 ----
  showGridLines: false,
  visibleGridCount: 42,
  activeRowIndexFromBottom: 13,
  scrollbarWidth: 12,
  gridLineColor: 0x334155,

  // ---- 刻度与逻辑坐标配置 ----
  minorTickLength: 8,
  stepCoord: 3,

  // ---- 交互选中态样式配置 ----
  selectedBgColor: 0x3b82f6,
  selectedBgAlpha: 0.45,

  musicVolume: 1,

  fixMusicDelay: 0.1,

  randomType: [16, 17, 18, 19, 20, 21, 22, 23, 26, 27],
  repeatChance: 10,
}

export const useGlobalConfigStore = defineStore('globalConfig', {
  state: (): GlobalConfig => {
    return { ...defaultGlobalConfig }
  },

  // 开启持久化插件自动同步到 localStorage
  persist: true,
})
