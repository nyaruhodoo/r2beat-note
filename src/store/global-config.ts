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
  /** 是否开启左右智能映射 */
  enableAutoDirection: boolean
  /** 是否显示单项障碍物 */
  enableSingleObstacle: boolean
  /** 方向键映射障碍物 */
  directionKeyMap: boolean

  shortcutKey: {
    title: string
    lock?: boolean
    keys: string[]
    event:
      | 'toggle-play'
      | 'toggle-scale'
      | 'undo'
      | 'redo'
      | 'select-obstacle'
      | 'decrease-beat'
      | 'increase-beat'
      | 'reset-beat'
      | 'decrease-speed'
      | 'increase-speed'
      | 'reset-speed'
  }[]
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

  // ===== 其他个性化配置 =====
  enableAutoDirection: true,
  enableSingleObstacle: false,
  directionKeyMap: true,

  // ===== 快捷键配置 =====
  shortcutKey: [
    { title: '选中障碍物', keys: ['Shift', 'MouseLeft'], event: 'select-obstacle', lock: true },
    { title: '切换音频播放', keys: ['Space'], event: 'toggle-play' },
    { title: '切换刻度值显示', keys: ['v'], event: 'toggle-scale' },
    { title: '撤回修改', keys: ['Control', 'z'], event: 'undo' },
    { title: '恢复修改', keys: ['Control', 'y'], event: 'redo' },
    { title: '降低节拍', keys: ['q'], event: 'decrease-beat' },
    { title: '增加节拍', keys: ['e'], event: 'increase-beat' },
    { title: '重置节拍', keys: ['w'], event: 'reset-beat' },
    { title: '降低速率', keys: ['a'], event: 'decrease-speed' },
    { title: '增加速率', keys: ['d'], event: 'increase-speed' },
    { title: '重置速率', keys: ['s'], event: 'reset-speed' },
  ],
}

export const useGlobalConfigStore = defineStore('globalConfig', {
  state: (): GlobalConfig => {
    return structuredClone(defaultGlobalConfig)
  },

  persist: {
    serializer: {
      serialize: JSON.stringify,
      deserialize: (val) => {
        const parsed = JSON.parse(val)
        // 使用默认值作为底图，再叠加上从 localStorage 解析出来的旧数据
        return {
          ...defaultGlobalConfig,
          ...parsed,
        }
      },
    },
  },
})
