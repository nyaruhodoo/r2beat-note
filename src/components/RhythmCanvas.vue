<template>
  <!-- 外部容器固定宽度 240px，高100% -->
  <main ref="containerRef"
    class="relative h-full w-60 shrink-0 select-none overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900 shadow-sm"
    @wheel="handleWheel" @contextmenu.prevent>
    <div ref="canvasContainerRef" class="h-full w-full overflow-hidden"></div>
  </main>
</template>

<script setup lang="ts">
import { spritesConfig } from '@/sprites'
import { useGlobalConfigStore } from '@/store/global-config'
import { useAppStore } from '@/store/store'
import type { BpmItem } from '@/store/store'
import { getDecimalPlaces } from '@/utils/utils'
import { useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import * as PIXI from 'pixi.js'
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'

export interface Obstacle {
  Coord: string
  Kind: string
  Level: string
  FxSndIndex: string
}

const props = withDefaults(
  defineProps<{
    currentTime: number
    currentFrame: number
    currentCoord: { raw: number; rounded: number }
    playbackRate: number
    bpm: number
    isPlaying?: boolean
    seekTo: (target: number | string, type: 'time' | 'frame' | 'coord') => void
    duration: number
    // 属于该组件特有的 UI 比例配置（非全局 Store 配置）
    gridAspect?: number
  }>(),
  {
    gridAspect: 45 / 186,
  }
)

const appStore = useAppStore()
const { currentSong, selectedObstacle } = storeToRefs(appStore)

// 引入全局配置 Store 并解构为响应式 refs
const globalConfigStore = useGlobalConfigStore()
const {
  activeRowColor,
  activeRowAlpha,
  showGridLines,
  visibleGridCount,
  activeRowIndexFromBottom,
  minorTickLength,
  stepCoord,
  selectedBgColor,
  selectedBgAlpha,
  scrollbarWidth,
  gridLineColor,
} = storeToRefs(globalConfigStore)

// 当前鼠标悬停状态
const hoverState = ref<{ coord: number; offsetXRatio: number } | null>(null)
const isRightMouseDown = ref(false)
const isLeftMouseDown = ref(false)

// 拖拽防重记录：避免同一 coord 内频繁重复触发增删
let lastProcessedDragCoord: number | null = null

// ---------------- 选中状态管理 ----------------
const selectedCoords = ref<Set<number>>(new Set())
const shiftAnchorCoord = ref<number | null>(null)

const setPendingObstacle = (obs: Obstacle | null) => {
  appStore.selectedObstacle = obs
}

defineExpose({
  setPendingObstacle,
  pendingObstacle: selectedObstacle,
  selectedCoords, // 暴露选中状态
})

// 提取障碍物列表
const obstacles = computed<Obstacle[]>(() => {
  const areaData = currentSong.value?.xmlObject?.TITLE?.AREA
  if (!areaData) return []
  return Array.isArray(areaData) ? areaData : [areaData]
})


/**
 * 真正修改 store 数据中的障碍物核心函数，无论添加还是剔除
 * 内置了一次排序
 */
function updateSongObstacles(newObstacles: Obstacle[]) {
  if (!currentSong.value?.xmlObject?.TITLE) return

  // 保持按 Coord 升序排列
  const sortedObstacles = [...newObstacles].sort((a, b) => Number(a.Coord) - Number(b.Coord))
  currentSong.value.xmlObject.TITLE.AREA = sortedObstacles
}


/**
 * 根据上下文映射合适的障碍物
 * 该函数允许报错，会在鼠标对应行内显示红色文字
 */
function generateObstacle(
  prevObs: Obstacle | null,
  nextObs: Obstacle | null,
  offsetXRatio: number
): Obstacle | null {
  if (!selectedObstacle.value) return null

  const prevObsKind = +(prevObs?.Kind ?? 0)
  // const nextObsKind = +(nextObs?.Kind ?? 0)
  const selectedObstacleKind = +selectedObstacle.value.Kind

  console.log({
    prevObs, nextObs, offsetXRatio, selectedObstacle: selectedObstacle.value
  })

  // 长按障碍物特殊映射
  if (selectedObstacle.value.Level === "5" && selectedObstacleKind > 100) {

    if ((prevObsKind !== selectedObstacleKind - 2 || prevObsKind === selectedObstacleKind) && (prevObsKind + 1 !== selectedObstacleKind)) {
      return {
        ...selectedObstacle.value,
        Kind: selectedObstacleKind - 2 + ''
      }
    }

  }



  return { ...selectedObstacle.value }
}

// 辅助方法：获取指定 Coord 前后的障碍物
function getSurroundingObstacles(targetCoord: number) {
  const step = stepCoord.value
  // 直接使用有序的 obstacles.value，无需重复拷贝和 sort
  const sorted = obstacles.value

  let prevObs: Obstacle | null = null
  let nextObs: Obstacle | null = null

  for (const obs of sorted) {
    const c = Number(obs.Coord)
    const rowSpan = obs.Kind === '24' ? 3 : 1
    const maxObsCoord = c + (rowSpan - 1) * step

    if (targetCoord >= c && targetCoord <= maxObsCoord) {
      continue
    }

    if (c < targetCoord) {
      prevObs = obs
    } else if (c > targetCoord) {
      nextObs = obs
      break // 已经有序，找到第一个大于 targetCoord 的即可直接退出
    }
  }


  return { prevObs, nextObs }
}



// ---------------- 衍生方向计算与预览障碍物处理 ----------------
const hoverDirection = computed<'left' | 'right' | null>(() => {
  if (!hoverState.value) return null
  return hoverState.value.offsetXRatio <= 0.5 ? 'left' : 'right'
})

const hoverCoord = computed(() => hoverState.value?.coord ?? null)

const previewObstacleState = ref<{
  obstacle: Obstacle | null
  error: string | null
}>({ obstacle: null, error: null })

function computePreviewObstacle() {
  if (!hoverState.value || !selectedObstacle.value) {
    previewObstacleState.value = { obstacle: null, error: null }
    return
  }

  const { coord, offsetXRatio } = hoverState.value
  const { prevObs, nextObs } = getSurroundingObstacles(coord)
  try {
    const obs = generateObstacle(prevObs, nextObs, offsetXRatio)
    previewObstacleState.value = { obstacle: obs, error: null }
  } catch (err: any) {
    previewObstacleState.value = {
      obstacle: null,
      error: err?.message || '非法位置',
    }
  }
}

// 精细化监听：仅在 hover 的 coord、方向(left/right) 或 selectedObstacle 发生变化时重新计算预览
watch(
  [hoverCoord, hoverDirection, selectedObstacle],
  () => {
    computePreviewObstacle()
  },
  { immediate: true }
)

// 辅助方法：删除包含/靠近指定 Coord 的障碍物（包含高精度障碍物）
function removeObstacleAtCoord(coord: number): boolean {
  const currentList = obstacles.value
  const step = stepCoord.value

  // 受保护的过渡障碍物 Kind 集合（不能直接被鼠标点击/主动删除）
  const PROTECTED_KINDS = new Set(['129', '132', '144', '141', '138', '135'])

  const minThreshold = coord - step / 2
  const maxThreshold = coord + step / 2

  // 1. 查找落在当前刻度范围内、且允许删除的障碍物
  const obstaclesToRemove = currentList.filter((obs) => {
    // 保护过渡障碍物，不允许直接点击删除
    if (PROTECTED_KINDS.has(obs.Kind)) {
      return false
    }

    const obsCoord = Number(obs.Coord)
    const rowSpan = obs.Kind === '24' ? 3 : 1
    const maxObsCoord = obsCoord + (rowSpan - 1) * step

    const isInsideRange = obsCoord > minThreshold && obsCoord < maxThreshold
    const isOverlapping = obsCoord <= maxThreshold && maxObsCoord >= minThreshold

    return isInsideRange || isOverlapping
  })

  if (obstaclesToRemove.length === 0) {
    return false
  }

  // 2. 从选中状态集合中移除待删除的坐标
  obstaclesToRemove.forEach((obs) => {
    selectedCoords.value.delete(Number(obs.Coord))
  })

  // 3. 基础删除：获取删除目标后的剩余列表
  let updatedList = currentList.filter((obs) => !obstaclesToRemove.includes(obs))

  // 4. 联动清理：如果本次删除包含了区间起止节点 (Kind > 100)，自动清除失效的过渡障碍物
  const hasRemovedIntervalBoundary = obstaclesToRemove.some(
    (obs) => Number(obs.Kind) > 100 && obs.Level === '5'
  )

  if (hasRemovedIntervalBoundary) {
    // 根据删除后的新列表重新计算当前所有有效的闭区间
    const validIntervals = calculateClosedIntervals(updatedList, RANGE_PAIR_MAP)

    // 过滤掉所有不在任何有效闭区间 (startCoord, endCoord) 内的过渡障碍物
    updatedList = updatedList.filter((obs) => {
      // 非过渡障碍物直接保留
      if (!PROTECTED_KINDS.has(obs.Kind)) {
        return true
      }

      const obsCoord = Number(obs.Coord)

      // 判断当前过渡障碍物是否处于某个有效的闭区间内
      const isInValidInterval = validIntervals.some(
        ({ startCoord, endCoord }) => obsCoord > startCoord && obsCoord < endCoord
      )

      return isInValidInterval
    })
  }

  // 5. 更新歌谱障碍物列表
  updateSongObstacles(updatedList)
  return true
}
// 辅助方法：在指定 Coord 摆放障碍物
function placeObstacleAtCoord(coord: number, offsetXRatio: number) {
  if (!selectedObstacle.value) return

  const currentList = obstacles.value

  // === 新增限制：不允许在已闭合的区间内（startCoord < coord < endCoord）放置任何障碍物 ===
  const existingIntervals = calculateClosedIntervals(currentList, RANGE_PAIR_MAP)
  const isInsideClosedInterval = existingIntervals.some(
    ({ startCoord, endCoord }) => coord > startCoord && coord < endCoord
  )

  if (isInsideClosedInterval) {
    console.warn(`[放置拦截] 坐标 ${coord} 处于已闭合区间内，禁止放置障碍物。`)
    return
  }

  const { prevObs, nextObs } = getSurroundingObstacles(coord)

  let finalObs: Obstacle | null = null
  try {
    finalObs = generateObstacle(prevObs, nextObs, offsetXRatio)
  } catch (err) {
    console.warn('摆放失败:', err)
    return
  }

  if (!finalObs) return

  const step = stepCoord.value

  // 1. 完全重复检测
  const isAlreadyPresent = currentList.some(
    (obs) => Number(obs.Coord) === coord && obs.Kind === finalObs?.Kind
  )
  if (isAlreadyPresent) return

  // 2. 清理与当前放置坐标重叠的旧障碍物
  let newObsList = currentList.filter((obs) => {
    const obsCoord = Number(obs.Coord)
    const rowSpan = obs.Kind === '24' ? 3 : 1
    const maxObsCoord = obsCoord + (rowSpan - 1) * step
    return !(coord >= obsCoord && coord <= maxObsCoord)
  })

  // 3. 追加新放置的障碍物
  newObsList.push({
    ...finalObs,
    Coord: coord.toString(),
  })

  // 4. 特殊障碍物区间自动填充逻辑 (Kind > 100 且 Level === "5")
  const kindNum = Number(finalObs.Kind)
  if (kindNum > 100 && finalObs.Level === "5") {
    const intervals = calculateClosedIntervals(newObsList, RANGE_PAIR_MAP)

    for (const interval of intervals) {
      const { startCoord, endCoord, fillKind } = interval

      // Step 4.1: 保留首尾（startCoord 和 endCoord），只清空中间 (startCoord, endCoord) 的过渡障碍物
      newObsList = newObsList.filter((obs) => {
        const c = Number(obs.Coord)
        return !(c > startCoord && c < endCoord)
      })

      // Step 4.2 & 4.3: 从 (endCoord - 12) 开始倒序递减，仅在严格大于 startCoord 的位置填充 fillKind
      const filledObstacles: Obstacle[] = []
      for (let curCoord = endCoord - 12; curCoord > startCoord; curCoord -= 12) {
        filledObstacles.push({
          ...finalObs,
          Kind: fillKind,
          Coord: curCoord.toString(),
        })
      }

      // 将中间填充的过渡障碍物合并回列表
      newObsList.push(...filledObstacles)
    }
  }

  updateSongObstacles(newObsList)
}

// 成对区间的连线/填充区间计算
const RANGE_PAIR_MAP: Record<string, { endKind: string; fillKind: string }> = {
  '128': { endKind: '130', fillKind: '129' },
  '131': { endKind: '133', fillKind: '132' },
  '134': { endKind: '136', fillKind: '135' },
  '137': { endKind: '139', fillKind: '138' },
  '143': { endKind: '145', fillKind: '144' },
  '140': { endKind: '142', fillKind: '141' },
}

/**
 * 根据输入的障碍物列表及映射规则，计算出已形成闭合的区间列表
 */
function calculateClosedIntervals(
  obstacles: Obstacle[],
  rangePairMap: Record<string, { endKind: string; fillKind: string }> = RANGE_PAIR_MAP
): {
  startCoord: number
  endCoord: number
  fillKind: string
}[] {
  if (!obstacles || obstacles.length === 0) return []


  const sorted = obstacles
  const intervals: {
    startCoord: number
    endCoord: number
    fillKind: string
  }[] = []
  // 维护每种起始 Kind 的 Coord 栈，用于处理嵌套/连续区间
  const activeStacks: Record<string, number[]> = {}

  for (const obs of sorted) {
    const coord = Number(obs.Coord)
    const kind = obs.Kind

    // 1. 如果是起始 Kind，压入对应的栈中
    if (rangePairMap[kind]) {
      if (!activeStacks[kind]) activeStacks[kind] = []
      activeStacks[kind].push(coord)
      continue
    }

    // 2. 如果是结束 Kind，寻找匹配的起始点构成闭合区间
    for (const [startKind, rule] of Object.entries(rangePairMap)) {
      if (kind === rule.endKind && activeStacks[startKind] && activeStacks[startKind].length > 0) {
        const startCoord = activeStacks[startKind].pop()!
        if (coord > startCoord) {
          intervals.push({
            startCoord,
            endCoord: coord,
            fillKind: rule.fillKind,
          })
        }
        break
      }
    }
  }

  return intervals
}



const filledIntervals = computed(() => {
  return calculateClosedIntervals(obstacles.value, RANGE_PAIR_MAP)
})

const maxCoord = ref<number>(0)

// BPM 分段计算
const bpmSegments = computed(() => {
  const bpmData = currentSong.value?.xmlObject?.TITLE?.BPM as BpmItem[]
  if (!bpmData || bpmData.length === 0) {
    return [{ frame: 0, startCoord: 0, bpm: props.bpm || 120 }]
  }

  const sortedNodes = [...bpmData]
    .map((node) => ({
      frame: Number(node.Frame),
      bpm: Number(node.BPM),
    }))
    .sort((a, b) => a.frame - b.frame)

  const segments = []
  let currentCoordAccumulator = 0

  for (let i = 0; i < sortedNodes.length; i++) {
    const node = sortedNodes[i]

    if (i > 0) {
      const prevNode = sortedNodes[i - 1]
      const deltaFrames = node.frame - prevNode.frame
      const coordPerFrame = prevNode.bpm / 300
      currentCoordAccumulator += deltaFrames * coordPerFrame
    }

    segments.push({
      frame: node.frame,
      startCoord: currentCoordAccumulator,
      bpm: node.bpm,
    })
  }
  return segments
})


function timeToCoord(time: number): number {
  const targetFrame = time * 60
  const segments = bpmSegments.value
  if (!segments.length) return 0

  let activeSegment = segments[0]
  for (let i = segments.length - 1; i >= 0; i--) {
    if (targetFrame >= segments[i].frame) {
      activeSegment = segments[i]
      break
    }
  }

  const deltaFrames = targetFrame - activeSegment.frame
  const coordPerFrame = activeSegment.bpm / 300
  return activeSegment.startCoord + deltaFrames * coordPerFrame
}

watch(
  () => [props.duration, currentSong.value?.xmlObject?.TITLE?.BPM],
  ([duration]) => {
    if (!duration || (duration as number) <= 0) {
      maxCoord.value = 0
      return
    }
    maxCoord.value = Math.round(timeToCoord(duration as number))
  },
  { immediate: true, deep: true }
)

const CONFIG = computed(() => ({
  visibleGridCount: visibleGridCount.value,
  activeRowIndexFromBottom: activeRowIndexFromBottom.value,
  minorTickLength: minorTickLength.value,
  stepCoord: stepCoord.value,
  gridAspect: props.gridAspect,
  scrollbarWidth: scrollbarWidth.value,
  gridLineColor: gridLineColor.value,
}))

const kindColorMap = new Map<string, number>()
function getKindColor(kind: string): number {
  if (!kindColorMap.has(kind)) {
    const hue = (Math.abs(hashCode(kind)) % 360) / 360
    kindColorMap.set(kind, hslToHex(hue, 0.75, 0.55))
  }
  return kindColorMap.get(kind)!
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return hash
}

function hslToHex(h: number, s: number, l: number): number {
  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255)
}

const canvasContainerRef = ref<HTMLDivElement | null>(null)
let app: PIXI.Application | null = null
let g: PIXI.Graphics | null = null
let textContainer: PIXI.Container | null = null
let spriteContainer: PIXI.Container | null = null

let isInitializing = false
let isDraggingScrollbar = false
let dragStartY = 0
let dragStartCoord = 0

let baseTexture: PIXI.Texture | null = null
const obstacleTexturesMap = new Map<string, PIXI.Texture>()

const textPool: PIXI.Text[] = []
let textPoolIndex = 0

const spritePool: PIXI.Sprite[] = []
let spritePoolIndex = 0

function getTextNode(content: string, x: number, y: number, fontSize = 11, color = 0x94a3b8) {
  let textNode: PIXI.Text
  if (textPoolIndex < textPool.length) {
    textNode = textPool[textPoolIndex]
    textNode.visible = true
    textNode.text = content
    textNode.style.fontSize = fontSize
    textNode.style.fill = color
  } else {
    textNode = new PIXI.Text({
      text: content,
      style: { fontFamily: 'monospace', fontSize, fill: color, align: 'right' },
    })
    textContainer?.addChild(textNode)
    textPool.push(textNode)
  }
  textNode.x = x
  textNode.y = y
  textPoolIndex++
  return textNode
}

function resetTextPool() {
  for (let i = textPoolIndex; i < textPool.length; i++) {
    textPool[i].visible = false
  }
  textPoolIndex = 0
}

function getSpriteNode(
  texture: PIXI.Texture,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 1
) {
  let spriteNode: PIXI.Sprite
  if (spritePoolIndex < spritePool.length) {
    spriteNode = spritePool[spritePoolIndex]
    spriteNode.visible = true
  } else {
    spriteNode = new PIXI.Sprite()
    spriteNode.anchor.set(0, 0)
    spriteContainer?.addChild(spriteNode)
    spritePool.push(spriteNode)
  }
  spriteNode.texture = texture
  spriteNode.x = x
  spriteNode.y = y
  spriteNode.width = width
  spriteNode.height = height
  spriteNode.alpha = alpha
  spritePoolIndex++
  return spriteNode
}

function resetSpritePool() {
  for (let i = spritePoolIndex; i < spritePool.length; i++) {
    spritePool[i].visible = false
  }
  spritePoolIndex = 0
}

async function loadSpritesheet() {
  try {
    baseTexture = await PIXI.Assets.load('/sprites.png')
    if (!baseTexture) return

    for (const [kind, config] of Object.entries(
      spritesConfig as Record<string, { x: number; y: number; width: number; height: number }>
    )) {
      const rect = new PIXI.Rectangle(config.x, config.y, config.width, config.height)
      const subTexture = new PIXI.Texture({
        source: baseTexture.source,
        frame: rect,
      })
      obstacleTexturesMap.set(kind, subTexture)
    }
  } catch (err) {
    console.error('Failed to load sprite sheet:', err)
  }
}

const snapToNearestTick = () => {
  const currentCoord = props.currentCoord
  const snappedCoord = Math.round(currentCoord.raw / stepCoord.value) * stepCoord.value
  props.seekTo(snappedCoord, 'coord')
}

watch(
  () => props.isPlaying,
  (playing) => {
    if (!playing) snapToNearestTick()
  }
)

watch(maxCoord, (newMax) => {
  if (newMax <= 0) return
  if (!app && !isInitializing) {
    initPixi()
  } else if (app) {
    if (props.currentCoord.raw > newMax) {
      props.seekTo(newMax, 'coord')
    }
  }
})

const initPixi = async () => {
  if (!canvasContainerRef.value || maxCoord.value <= 0 || app || isInitializing) return

  isInitializing = true

  const instance = new PIXI.Application()
  await instance.init({
    resizeTo: canvasContainerRef.value,
    backgroundColor: 0x0f172a,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  })

  if (!canvasContainerRef.value) {
    instance.destroy(true, { children: true })
    isInitializing = false
    return
  }

  app = instance
  canvasContainerRef.value.appendChild(app.canvas)

  await loadSpritesheet()

  g = new PIXI.Graphics()
  spriteContainer = new PIXI.Container()
  textContainer = new PIXI.Container()

  app.stage.addChild(g)
  app.stage.addChild(spriteContainer)
  app.stage.addChild(textContainer)

  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen
  app.stage.on('pointerdown', handleCanvasClick)
  app.stage.on('pointermove', handlePointerMove)
  app.stage.on('pointerup', handlePointerUp)
  app.stage.on('pointerupoutside', handlePointerUp)
  app.stage.on('pointerleave', () => {
    hoverState.value = null
    isRightMouseDown.value = false
    isLeftMouseDown.value = false
    lastProcessedDragCoord = null
  })

  app.ticker.add(renderEditor)
  isInitializing = false
}

function getPointerGridState(
  x: number,
  y: number
): { coord: number; offsetXRatio: number } | null {
  if (!app) return null
  const cfg = CONFIG.value
  const viewWidth = app.screen.width
  const viewHeight = app.screen.height
  const gridHeight = viewHeight / cfg.visibleGridCount
  const trackWidth = gridHeight / cfg.gridAspect
  const trackStartX = (viewWidth - trackWidth) / 2

  if (x < trackStartX || x > trackStartX + trackWidth) {
    return null
  }

  const relativeX = x - trackStartX
  const offsetXRatio = (relativeX / trackWidth) * 2 - 1

  const rowHPerCoord = gridHeight / cfg.stepCoord
  const targetBaselineY = viewHeight - (cfg.activeRowIndexFromBottom - 0.5) * gridHeight

  const relativeY = targetBaselineY - y
  const rawCoord = props.currentCoord.raw + relativeY / rowHPerCoord

  const snapped = Math.round(rawCoord / cfg.stepCoord) * cfg.stepCoord
  if (snapped < 0 || snapped > maxCoord.value) return null

  return { coord: snapped, offsetXRatio }
}

function renderObstacleItem(
  kind: string,
  coord: number,
  trackStartX: number,
  trackWidth: number,
  gridHeight: number,
  coordToCenterY: (c: number) => number,
  alpha = 1.0,
  isSelected = false
) {
  if (!g) return
  const isKind24 = kind === '24'
  const rowSpan = isKind24 ? 3 : 1
  const totalHeight = gridHeight * rowSpan

  const startCenterY = coordToCenterY(coord)
  const cellTopY = startCenterY - gridHeight / 2 - (rowSpan - 1) * gridHeight

  if (isSelected) {
    g.rect(trackStartX, cellTopY, trackWidth, totalHeight)
    g.fill({ color: selectedBgColor.value, alpha: selectedBgAlpha.value })
    g.stroke({ width: 2, color: selectedBgColor.value, alpha: 0.9 })
  }

  const texture = obstacleTexturesMap.get(kind)

  if (texture) {
    getSpriteNode(texture, trackStartX, cellTopY, trackWidth, totalHeight, alpha)
  } else {
    const color = getKindColor(kind)
    g.rect(trackStartX, cellTopY, trackWidth, totalHeight)
    g.fill({ color, alpha: 0.9 * alpha })
    g.stroke({ width: 1.5, color: 0x000000, alpha: 0.4 * alpha })

    const centerX = trackStartX + trackWidth / 2
    const centerY = startCenterY - ((rowSpan - 1) * gridHeight) / 2
    const txt = getTextNode(`Kind: ${kind}`, centerX, centerY, 11, 0xffffff)
    txt.anchor.set(0.5, 0.5)
  }
}

const renderEditor = () => {
  if (!app || !g || maxCoord.value <= 0) return

  const cfg = CONFIG.value
  g.clear()
  resetTextPool()
  resetSpritePool()

  const viewHeight = app.screen.height
  const viewWidth = app.screen.width

  const gridHeight = viewHeight / cfg.visibleGridCount
  const trackWidth = gridHeight / cfg.gridAspect

  // 滚动条靠右放置（保留 2px 边距）
  const scrollbarStartX = viewWidth - cfg.scrollbarWidth - 4
  const trackStartX = (viewWidth - trackWidth) / 2

  const minorTickLengthVal = cfg.minorTickLength
  const majorTickLength = minorTickLengthVal * 3
  const tickEndX = trackStartX - 4

  const currentCoord = props.currentCoord
  const targetBaselineY = viewHeight - (cfg.activeRowIndexFromBottom - 0.5) * gridHeight
  const rowHPerCoord = gridHeight / cfg.stepCoord

  const coordToCenterY = (coord: number) => {
    return targetBaselineY - (coord - currentCoord.raw) * rowHPerCoord
  }

  const visibleCoordRange = viewHeight / rowHPerCoord + 12
  const minVisibleCoord =
    currentCoord.raw - (cfg.activeRowIndexFromBottom * gridHeight) / rowHPerCoord - 12
  const maxVisibleCoord = currentCoord.raw + visibleCoordRange

  // 计算精度用于刻度文本展示
  const precision = getDecimalPlaces(cfg.stepCoord)

  // 1. 背景
  g.rect(trackStartX, 0, trackWidth, viewHeight)
  g.fill({ color: 0x000000 })

  // 2. 网格与刻度
  const startCoordIndex = Math.floor(minVisibleCoord / cfg.stepCoord)
  const maxCoordIndex = Math.ceil(maxVisibleCoord / cfg.stepCoord)
  const isShowGridLines = showGridLines.value

  for (let i = startCoordIndex; i <= maxCoordIndex; i++) {
    const c = i * cfg.stepCoord
    if (c < 0) continue

    const centerY = coordToCenterY(c)
    const cellTopY = centerY - gridHeight / 2
    const cellBottomY = centerY + gridHeight / 2

    if (isShowGridLines) {
      g.moveTo(trackStartX, cellTopY)
      g.lineTo(trackStartX + trackWidth, cellTopY)
      g.stroke({ width: 1, color: cfg.gridLineColor })

      g.moveTo(trackStartX, cellBottomY)
      g.lineTo(trackStartX + trackWidth, cellBottomY)
      g.stroke({ width: 1, color: cfg.gridLineColor })
    }

    const posInGroup = (((i + 4) % 8) + 8) % 8

    if (posInGroup === 4) {
      const displayText = precision > 0 ? c.toFixed(precision) : c.toString()
      const txt = getTextNode(displayText, tickEndX, centerY, 11, 0x94a3b8)
      txt.anchor.set(1, 0.5)
    } else if (posInGroup === 0) {
      g.moveTo(tickEndX - majorTickLength, centerY)
      g.lineTo(tickEndX, centerY)
      g.stroke({ width: 1.5, color: 0x94a3b8 })
    } else {
      g.moveTo(tickEndX - minorTickLengthVal, centerY)
      g.lineTo(tickEndX, centerY)
      g.stroke({ width: 1, color: 0x475569 })
    }
  }

  // 3. 当前行高亮
  const activeCellTopY = targetBaselineY - gridHeight / 2
  g.rect(trackStartX, activeCellTopY, trackWidth, gridHeight)
  g.fill({ color: activeRowColor.value, alpha: activeRowAlpha.value })

  // 4. 连线填充（带视口剪裁早退）
  const intervals = filledIntervals.value
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i]
    if (interval.endCoord < minVisibleCoord || interval.startCoord > maxVisibleCoord) {
      continue
    }

    const texture = obstacleTexturesMap.get(interval.fillKind)
    const fillKindColor = texture ? 0 : getKindColor(interval.fillKind)

    for (let c = interval.startCoord + cfg.stepCoord; c < interval.endCoord; c += cfg.stepCoord) {
      if (c < minVisibleCoord) continue
      if (c > maxVisibleCoord) break

      const centerY = coordToCenterY(c)
      const cellTopY = centerY - gridHeight / 2

      if (texture) {
        getSpriteNode(texture, trackStartX, cellTopY, trackWidth, gridHeight)
      } else {
        g.rect(trackStartX, cellTopY, trackWidth, gridHeight)
        g.fill({ color: fillKindColor, alpha: 0.9 })
        g.stroke({ width: 1.5, color: 0x000000, alpha: 0.4 })

        const centerX = trackStartX + trackWidth / 2
        const txt = getTextNode(`Kind: ${interval.fillKind}`, centerX, centerY, 11, 0xffffff)
        txt.anchor.set(0.5, 0.5)
      }
    }
  }

  // 5. 现存障碍物渲染（前提：obstacles 数组已按 Coord 升序排列，支持 Break 早退）
  const obstacleList = obstacles.value
  const currentHoverCoord = hoverState.value?.coord ?? null
  const hasSelectedObstacle = !!selectedObstacle.value

  for (let i = 0; i < obstacleList.length; i++) {
    const obs = obstacleList[i]
    const obsCoord = Number(obs.Coord)

    // 关键早退判断：由于数组升序，当障碍物起点已超过视口上限，后续所有障碍物都无需处理，直接跳出循环
    if (obsCoord > maxVisibleCoord) break

    const isKind24 = obs.Kind === '24'
    const rowSpan = isKind24 ? 3 : 1
    const maxObsCoord = obsCoord + (rowSpan - 1) * cfg.stepCoord

    // 下方视口外的障碍物过滤
    if (maxObsCoord < minVisibleCoord) continue

    // 悬停摆放预览避让
    if (
      hasSelectedObstacle &&
      currentHoverCoord !== null &&
      currentHoverCoord >= obsCoord &&
      currentHoverCoord <= maxObsCoord
    ) {
      continue
    }

    const isSelected = selectedCoords.value.has(obsCoord)

    renderObstacleItem(
      obs.Kind,
      obsCoord,
      trackStartX,
      trackWidth,
      gridHeight,
      coordToCenterY,
      1.0,
      isSelected
    )
  }

  // 5.5 预览摆放
  if (hasSelectedObstacle && hoverState.value !== null) {
    const { coord } = hoverState.value
    const { obstacle: previewObs, error: errorMessage } = previewObstacleState.value

    if (errorMessage) {
      const centerY = coordToCenterY(coord)
      const cellTopY = centerY - gridHeight / 2

      g.rect(trackStartX, cellTopY, trackWidth, gridHeight)
      g.fill({ color: 0xef4444, alpha: 0.35 })
      g.stroke({ width: 1.5, color: 0xef4444, alpha: 0.8 })

      const centerX = trackStartX + trackWidth / 2
      const txt = getTextNode(errorMessage, centerX, centerY, 11, 0xf87171)
      txt.anchor.set(0.5, 0.5)
    } else if (previewObs) {
      renderObstacleItem(
        previewObs.Kind,
        coord,
        trackStartX,
        trackWidth,
        gridHeight,
        coordToCenterY,
        0.6
      )
    }
  }

  // 6. 滚动条
  const trackHeight = viewHeight - 20
  const trackY0 = 10

  g.roundRect(scrollbarStartX, trackY0, cfg.scrollbarWidth, trackHeight, 3)
  g.fill({ color: 0x1e293b })

  const thumbHeight = Math.max(30, (viewHeight / (maxCoord.value * rowHPerCoord)) * trackHeight)
  const availableTrackLength = trackHeight - thumbHeight
  const progressRatio = Math.min(1, Math.max(0, currentCoord.raw / maxCoord.value))

  const thumbY = trackY0 + availableTrackLength * (1 - progressRatio)

  g.roundRect(scrollbarStartX, thumbY, cfg.scrollbarWidth, thumbHeight, 3)
  g.fill({ color: isDraggingScrollbar ? 0x38bdf8 : 0x64748b })
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  if (maxCoord.value <= 0) return

  const cfg = CONFIG.value
  const currentCoord = props.currentCoord
  const baseTick = Math.round(currentCoord.raw / cfg.stepCoord) * cfg.stepCoord
  const stepDelta = e.deltaY < 0 ? cfg.stepCoord : -cfg.stepCoord
  const targetCoord = Math.max(0, Math.min(maxCoord.value, baseTick + stepDelta))

  props.seekTo(targetCoord, 'coord')
}

// ---------------- 点击交互逻辑 ----------------
const handleCanvasClick = (e: PIXI.FederatedPointerEvent) => {
  if (!app || maxCoord.value <= 0) return

  const cfg = CONFIG.value
  const viewWidth = app.screen.width
  const scrollbarStartX = viewWidth - cfg.scrollbarWidth - 2

  const clickX = e.global.x
  const clickY = e.global.y
  const button = e.button

  // 1. 点击滚动条
  if (clickX >= scrollbarStartX - 6 && button === 0) {
    isDraggingScrollbar = true
    dragStartY = clickY
    dragStartCoord = props.currentCoord.raw
    return
  }

  const pointerState = getPointerGridState(clickX, clickY)

  // 2. 右键逻辑
  if (button === 2) {
    let removedSuccess = false

    if (pointerState !== null) {
      removedSuccess = removeObstacleAtCoord(pointerState.coord)
    }

    if (removedSuccess) {
      isRightMouseDown.value = true
      lastProcessedDragCoord = pointerState ? pointerState.coord : null
      return
    }

    if (selectedObstacle.value) {
      appStore.selectedObstacle = null
      return
    }

    isRightMouseDown.value = true
    lastProcessedDragCoord = pointerState ? pointerState.coord : null
    return
  }

  if (button === 0 && pointerState !== null) {
    const clickedCoord = pointerState.coord

    if (selectedObstacle.value) {
      isLeftMouseDown.value = true
      lastProcessedDragCoord = clickedCoord
      placeObstacleAtCoord(clickedCoord, pointerState.offsetXRatio)
      return
    }

    if (e.shiftKey) {
      const targetObs = obstacles.value.find((obs) => {
        const c = Number(obs.Coord)
        const rowSpan = obs.Kind === '24' ? 3 : 1
        const maxObsCoord = c + (rowSpan - 1) * cfg.stepCoord
        return clickedCoord >= c && clickedCoord <= maxObsCoord
      })

      if (shiftAnchorCoord.value === null) {
        // 锚点不存在时：初始化锚点，并仅选中当前点击的障碍物（如果有）
        shiftAnchorCoord.value = clickedCoord
        selectedCoords.value.clear()
        if (targetObs) {
          selectedCoords.value.add(Number(targetObs.Coord))
        }
      } else {
        // 锚点已存在：计算区间框选 [shiftAnchorCoord, clickedCoord]
        selectedCoords.value.clear()

        const start = Math.min(shiftAnchorCoord.value, clickedCoord)
        const end = Math.max(shiftAnchorCoord.value, clickedCoord)

        obstacles.value.forEach((obs) => {
          const c = Number(obs.Coord)
          const rowSpan = obs.Kind === '24' ? 3 : 1
          const maxObsCoord = c + (rowSpan - 1) * cfg.stepCoord

          if (c <= end && maxObsCoord >= start) {
            selectedCoords.value.add(c)
          }
        })
      }

      // 如果成功选中了障碍物，清空待摆放状态（退出放置模式）
      if (selectedCoords.value.size > 0 && selectedObstacle.value) {
        appStore.selectedObstacle = null
      }
      return
    }

    // 模式 C: 未按 Shift 键的普通左键点击 -> 清空选中状态，重置锚点
    selectedCoords.value.clear()
    shiftAnchorCoord.value = null
  }
}

const handlePointerMove = (e: PIXI.FederatedPointerEvent) => {
  if (!app || maxCoord.value <= 0) return

  const pointerState = getPointerGridState(e.global.x, e.global.y)
  hoverState.value = pointerState

  // 关键优化：只有在鼠标跨越到新的 coord 时才触发连续增删
  if (pointerState !== null && pointerState.coord !== lastProcessedDragCoord) {
    if (isRightMouseDown.value) {
      removeObstacleAtCoord(pointerState.coord)
      lastProcessedDragCoord = pointerState.coord
    } else if (isLeftMouseDown.value && selectedObstacle.value) {
      placeObstacleAtCoord(pointerState.coord, pointerState.offsetXRatio)
      lastProcessedDragCoord = pointerState.coord
    }
  }

  if (!isDraggingScrollbar) return

  const cfg = CONFIG.value
  const viewHeight = app.screen.height
  const trackHeight = viewHeight - 20

  const gridHeight = viewHeight / cfg.visibleGridCount
  const rowHPerCoord = gridHeight / cfg.stepCoord

  const thumbHeight = Math.max(30, (viewHeight / (maxCoord.value * rowHPerCoord)) * trackHeight)
  const availableTrackLength = trackHeight - thumbHeight

  const deltaY = e.global.y - dragStartY
  const deltaCoord = -(deltaY / availableTrackLength) * maxCoord.value

  const rawTargetCoord = dragStartCoord + deltaCoord
  const snappedCoord = Math.round(rawTargetCoord / cfg.stepCoord) * cfg.stepCoord
  const targetCoord = Math.max(0, Math.min(maxCoord.value, snappedCoord))

  props.seekTo(targetCoord, 'coord')
}

const handlePointerUp = (e: PIXI.FederatedPointerEvent) => {
  if (e.button === 0) {
    isLeftMouseDown.value = false
  }
  if (e.button === 2) {
    isRightMouseDown.value = false
  }
  lastProcessedDragCoord = null

  if (isDraggingScrollbar) {
    isDraggingScrollbar = false
    snapToNearestTick()
  }
}

// 监听 Esc 键按下取消选中待摆放项
useEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    if (selectedObstacle.value) {
      appStore.selectedObstacle = null
    }
  }
})

onMounted(() => {
  if (maxCoord.value > 0) {
    initPixi()
  }
})

onUnmounted(() => {
  if (app) {
    app.stage.off('pointerdown', handleCanvasClick)
    app.stage.off('pointermove', handlePointerMove)
    app.stage.off('pointerup', handlePointerUp)
    app.stage.off('pointerupoutside', handlePointerUp)
    app.destroy(true, { children: true })
    app = null
  }
})
</script>