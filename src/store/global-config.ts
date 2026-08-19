import { defineStore } from 'pinia'

/**
 * 视轨与音轨渲染的全量动态配置接口 (全量采用 0xRRGGBBAA 8位 HEX 色值)
 */
export interface GlobalConfig {
  // ===== 激活行 / 判定线配置 =====
  /** 激活行/当前演奏线的颜色 (0xRRGGBBAA) */
  activeRowColor: number

  // ===== 网格与视口配置 =====
  /** 是否在背景中显示网格辅助线 (true: 显示, false: 隐藏) */
  showGridLines: boolean
  /** 视口范围内可见的网格总行数/总划分数 */
  visibleGridCount: number
  /** 激活行/判定线距离底部的网格行数位置 */
  activeRowIndexFromBottom: number
  /** 滚动条宽度 (PX) */
  scrollbarWidth: number
  /** 网格线颜色 (0xRRGGBBAA) */
  gridLineColor: number
  /** 画布整体宽度 */
  canvasWidth: number

  // ===== 画布与轨道背景配置 =====
  /** 画布背景色 (0xRRGGBBAA) */
  canvasBgColor: number
  /** 轨道背景色 (0xRRGGBBAA) */
  trackBgColor: number
  /** 刻度线与文字颜色 (0xRRGGBBAA) */
  tickColor: number

  // ===== 刻度与逻辑坐标配置 =====
  /** 次要刻度线/小节内部微调刻度线的绘制长度 (PX) */
  minorTickLength: number
  /** 基础步长坐标单位 */
  stepCoord: number

  // ===== 交互选中态样式配置 =====
  /** 处于选中/高亮状态下的障碍物或音符块的背景颜色 (0xRRGGBBAA) */
  selectedBgColor: number

  // ===== 音频配置 =====
  /** 音乐总音量 (0-1) */
  musicVolume: number
  /** 人工修正歌曲延迟 (秒) */
  fixMusicDelay: number

  // ===== 随机障碍物生成配置 =====
  /** 允许的随机障碍物类型列表 */
  randomType: number[]
  /** 随机障碍物重复概率取值 0-100 */
  repeatChance: number

  // ===== 快捷键配置 =====
  /** 快捷键切换选择障碍物 */
  directionKeyMap: boolean
  /** 快捷键调整播放速率 */
  rateKeyMap: boolean
}

export const defaultGlobalConfig: GlobalConfig = {
  // ===== 激活行 / 判定线配置 =====
  activeRowColor: 0xffffffff, // 纯白，不透明

  // ===== 网格与视口配置 =====
  showGridLines: false,
  visibleGridCount: 42,
  activeRowIndexFromBottom: 13,
  scrollbarWidth: 12,
  gridLineColor: 0x334155ff, // Slate-700，不透明
  canvasWidth: 240,

  // ===== 画布与轨道背景配置 =====
  canvasBgColor: 0x0f172aff, // Slate-900，不透明
  trackBgColor: 0x000000ff, // 纯黑，不透明
  tickColor: 0x94a3b8ff, // Slate-400，不透明

  // ===== 刻度与逻辑坐标配置 =====
  minorTickLength: 8,
  stepCoord: 3,

  // ===== 交互选中态样式配置 =====
  selectedBgColor: 0x3b82f673,

  // ===== 音频配置 =====
  musicVolume: 1,
  fixMusicDelay: 0.07,

  // ===== 随机障碍物生成配置 =====
  randomType: [16, 17, 18, 19, 20, 21, 22, 23, 26, 27],
  repeatChance: 10,

  // ===== 快捷键配置 =====
  directionKeyMap: true,
  rateKeyMap: true,
}

export const useGlobalConfigStore = defineStore('globalConfig', {
  state: (): GlobalConfig => {
    return { ...defaultGlobalConfig }
  },

  // 开启持久化插件自动同步到 localStorage
  persist: true,
})
