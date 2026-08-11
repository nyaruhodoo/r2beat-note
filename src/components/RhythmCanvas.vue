<template>
  <main ref="containerRef"
    class="relative h-full w-60 shrink-0 select-none overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900"
    @wheel="handleWheel" @contextmenu.prevent>
    <div ref="canvasContainerRef" class="h-full w-full overflow-hidden"></div>
  </main>
</template>

<script setup lang="ts">
import { spritesConfig } from '@/sprites'
import { useGlobalConfigStore } from '@/store/global-config'
import { useAppStore } from '@/store/store'
import { getDecimalPlaces } from '@/utils/utils'
import { useEventListener } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import * as PIXI from 'pixi.js'
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import spriteUrl from '@/assets/sprites.png'

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
    gridAspect?: number
  }>(),
  {
    gridAspect: 45 / 186,
  }
)

const appStore = useAppStore()
const { currentSong, selectedObstacle } = storeToRefs(appStore)

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

const hoverState = ref<{ coord: number; offsetXRatio: number } | null>(null)
const isRightMouseDown = ref(false)
const isLeftMouseDown = ref(false)

let lastProcessedDragCoord: number | null = null

const selectedCoords = ref<Set<number>>(new Set())
const shiftAnchorCoord = ref<number | null>(null)

const setPendingObstacle = (obs: Obstacle | null) => {
  appStore.selectedObstacle = obs
}

defineExpose({
  setPendingObstacle,
  pendingObstacle: selectedObstacle,
  selectedCoords,
})

const obstacles = computed<Obstacle[]>(() => {
  const areaData = currentSong.value?.xmlObject?.TITLE?.AREA
  if (!areaData) return []
  return Array.isArray(areaData) ? areaData : [areaData]
})

function updateSongObstacles(newObstacles: Obstacle[]) {
  if (!currentSong.value?.xmlObject?.TITLE) return
  const sortedObstacles = [...newObstacles].sort((a, b) => Number(a.Coord) - Number(b.Coord))
  currentSong.value.xmlObject.TITLE.AREA = sortedObstacles
}

function generateObstacle(
  prevObs: Obstacle | null,
  nextObs: Obstacle | null,
  offsetXRatio: number
): Obstacle | null {
  if (!selectedObstacle.value) return null

  const prevObsKind = +(prevObs?.Kind ?? 0)
  const selectedObstacleKind = +selectedObstacle.value.Kind

  console.log({
    prevObs, nextObs, offsetXRatio, selectedObstacle: selectedObstacle.value
  })

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

function getSurroundingObstacles(targetCoord: number) {
  const step = stepCoord.value
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
      break
    }
  }

  return { prevObs, nextObs }
}

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

watch(
  [hoverCoord, hoverDirection, selectedObstacle],
  () => {
    computePreviewObstacle()
  },
  { immediate: true }
)

function removeObstacleAtCoord(coord: number): boolean {
  const currentList = obstacles.value
  const step = stepCoord.value
  const PROTECTED_KINDS = new Set(['129', '132', '144', '141', '138', '135'])

  const minThreshold = coord - step / 2
  const maxThreshold = coord + step / 2

  const obstaclesToRemove = currentList.filter((obs) => {
    if (PROTECTED_KINDS.has(obs.Kind)) return false
    const obsCoord = Number(obs.Coord)
    const rowSpan = obs.Kind === '24' ? 3 : 1
    const maxObsCoord = obsCoord + (rowSpan - 1) * step
    const isInsideRange = obsCoord > minThreshold && obsCoord < maxThreshold
    const isOverlapping = obsCoord <= maxThreshold && maxObsCoord >= minThreshold
    return isInsideRange || isOverlapping
  })

  if (obstaclesToRemove.length === 0) return false

  obstaclesToRemove.forEach((obs) => {
    selectedCoords.value.delete(Number(obs.Coord))
  })

  let updatedList = currentList.filter((obs) => !obstaclesToRemove.includes(obs))

  const hasRemovedIntervalBoundary = obstaclesToRemove.some(
    (obs) => Number(obs.Kind) > 100 && obs.Level === '5'
  )

  if (hasRemovedIntervalBoundary) {
    const validIntervals = calculateClosedIntervals(updatedList, RANGE_PAIR_MAP)
    updatedList = updatedList.filter((obs) => {
      if (!PROTECTED_KINDS.has(obs.Kind)) return true
      const obsCoord = Number(obs.Coord)
      const isInValidInterval = validIntervals.some(
        ({ startCoord, endCoord }) => obsCoord > startCoord && obsCoord < endCoord
      )
      return isInValidInterval
    })
  }

  updateSongObstacles(updatedList)
  return true
}

function placeObstacleAtCoord(coord: number, offsetXRatio: number) {
  if (!selectedObstacle.value) return
  const currentList = obstacles.value

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

  const isAlreadyPresent = currentList.some(
    (obs) => Number(obs.Coord) === coord && obs.Kind === finalObs?.Kind
  )
  if (isAlreadyPresent) return

  let newObsList = currentList.filter((obs) => {
    const obsCoord = Number(obs.Coord)
    const rowSpan = obs.Kind === '24' ? 3 : 1
    const maxObsCoord = obsCoord + (rowSpan - 1) * step
    return !(coord >= obsCoord && coord <= maxObsCoord)
  })

  newObsList.push({
    ...finalObs,
    Coord: coord.toString(),
  })

  const kindNum = Number(finalObs.Kind)
  if (kindNum > 100 && finalObs.Level === "5") {
    const intervals = calculateClosedIntervals(newObsList, RANGE_PAIR_MAP)

    for (const interval of intervals) {
      const { startCoord, endCoord, fillKind } = interval

      newObsList = newObsList.filter((obs) => {
        const c = Number(obs.Coord)
        return !(c > startCoord && c < endCoord)
      })

      const filledObstacles: Obstacle[] = []
      for (let curCoord = endCoord - 12; curCoord > startCoord; curCoord -= 12) {
        filledObstacles.push({
          ...finalObs,
          Kind: fillKind,
          Coord: curCoord.toString(),
        })
      }
      newObsList.push(...filledObstacles)
    }
  }

  updateSongObstacles(newObsList)
}

const RANGE_PAIR_MAP: Record<string, { endKind: string; fillKind: string }> = {
  '128': { endKind: '130', fillKind: '129' },
  '131': { endKind: '133', fillKind: '132' },
  '134': { endKind: '136', fillKind: '135' },
  '137': { endKind: '139', fillKind: '138' },
  '143': { endKind: '145', fillKind: '144' },
  '140': { endKind: '142', fillKind: '141' },
}

function calculateClosedIntervals(
  obstacles: Obstacle[],
  rangePairMap: Record<string, { endKind: string; fillKind: string }> = RANGE_PAIR_MAP
): { startCoord: number; endCoord: number; fillKind: string }[] {
  if (!obstacles || obstacles.length === 0) return []

  const sorted = obstacles
  const intervals: { startCoord: number; endCoord: number; fillKind: string }[] = []
  const activeStacks: Record<string, number[]> = {}

  for (const obs of sorted) {
    const coord = Number(obs.Coord)
    const kind = obs.Kind

    if (rangePairMap[kind]) {
      if (!activeStacks[kind]) activeStacks[kind] = []
      activeStacks[kind].push(coord)
      continue
    }

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

// BPM 分段计算
const bpmSegments = computed(() => {
  const bpmData = currentSong.value?.xmlObject?.TITLE?.BPM
  const defaultBpm = props.bpm ?? 120

  let sortedNodes: Array<{ frame: number; bpm: number }> = []

  if (bpmData && bpmData.length > 0) {
    sortedNodes = bpmData
      .map((node) => {
        const bpmVal = Number(node.BPM)
        return {
          frame: Number(node.Frame) || 0,
          bpm: Number.isNaN(bpmVal) ? defaultBpm : bpmVal,
        }
      })
      .sort((a, b) => a.frame - b.frame)
  }

  if (sortedNodes.length === 0) {
    sortedNodes.push({ frame: 0, bpm: defaultBpm })
  } else if (sortedNodes[0].frame > 0) {
    sortedNodes.unshift({ frame: 0, bpm: sortedNodes[0].bpm })
  }

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

// 计算出整首曲子的 raw 坐标范围（用于滚动条、视口限制）
const coordRange = computed(() => {
  const segments = bpmSegments.value
  if (segments.length === 0) return { min: 0, max: 0, span: 0 }

  // 计算曲子开头和结尾的坐标
  const startCoord = 0 // 时间 0 的坐标，由 bpmSegments 保证为 0
  const endCoord = timeToCoord(props.duration) // 时间 duration 的坐标

  // 收集所有分段边界点的坐标（包含开头和结尾）
  const coords = [startCoord, endCoord]
  for (const seg of segments) {
    coords.push(seg.startCoord)
  }

  const min = Math.min(...coords)
  const max = Math.max(...coords)
  const span = max - min

  return { min, max, span }
})

// 原 maxCoord 不再直接使用，改为从 coordRange 获取
const maxCoord = computed(() => coordRange.value.max)

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
    baseTexture = await PIXI.Assets.load(spriteUrl)
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

// 当坐标范围或 song 变化时，确保 PIXI 初始化
watch(
  [coordRange, () => currentSong.value],
  ([range]) => {
    if (range.span > 0 && !app && !isInitializing) {
      initPixi()
    }
  },
  { immediate: true }
)

const initPixi = async () => {
  if (!canvasContainerRef.value || app || isInitializing) return
  const range = coordRange.value
  if (range.span <= 0) return

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
  const { min, max } = coordRange.value
  if (snapped < min || snapped > max) return null

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
  const range = coordRange.value
  if (!app || !g || range.span <= 0) return

  const cfg = CONFIG.value
  g.clear()
  resetTextPool()
  resetSpritePool()

  const viewHeight = app.screen.height
  const viewWidth = app.screen.width

  const gridHeight = viewHeight / cfg.visibleGridCount
  const trackWidth = gridHeight / cfg.gridAspect

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

  const precision = getDecimalPlaces(cfg.stepCoord)

  // 背景
  g.rect(trackStartX, 0, trackWidth, viewHeight)
  g.fill({ color: 0x000000 })

  // 网格与刻度（允许负坐标）
  const startCoordIndex = Math.floor(minVisibleCoord / cfg.stepCoord)
  const maxCoordIndex = Math.ceil(maxVisibleCoord / cfg.stepCoord)
  const isShowGridLines = showGridLines.value

  for (let i = startCoordIndex; i <= maxCoordIndex; i++) {
    const c = i * cfg.stepCoord
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

  // 当前行高亮
  const activeCellTopY = targetBaselineY - gridHeight / 2
  g.rect(trackStartX, activeCellTopY, trackWidth, gridHeight)
  g.fill({ color: activeRowColor.value, alpha: activeRowAlpha.value })

  // 连线填充
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

  // 现存障碍物
  const obstacleList = obstacles.value
  const currentHoverCoord = hoverState.value?.coord ?? null
  const hasSelectedObstacle = !!selectedObstacle.value

  for (let i = 0; i < obstacleList.length; i++) {
    const obs = obstacleList[i]
    const obsCoord = Number(obs.Coord)

    if (obsCoord > maxVisibleCoord) break

    const isKind24 = obs.Kind === '24'
    const rowSpan = isKind24 ? 3 : 1
    const maxObsCoord = obsCoord + (rowSpan - 1) * cfg.stepCoord

    if (maxObsCoord < minVisibleCoord) continue

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

  // 预览摆放
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

  // 滚动条（基于 raw 坐标范围）
  const { min: rawMin, max: rawMax, span: rawSpan } = range
  const trackHeight = viewHeight - 20
  const trackY0 = 10

  g.roundRect(scrollbarStartX, trackY0, cfg.scrollbarWidth, trackHeight, 3)
  g.fill({ color: 0x1e293b })

  const thumbHeight = Math.max(30, (viewHeight / (rawSpan * rowHPerCoord)) * trackHeight)
  const availableTrackLength = trackHeight - thumbHeight
  // 当前坐标在 raw 范围中的比例（0~1）
  const progressRatio =
    rawSpan > 0 ? Math.min(1, Math.max(0, (currentCoord.raw - rawMin) / rawSpan)) : 0

  const thumbY = trackY0 + availableTrackLength * (1 - progressRatio)

  g.roundRect(scrollbarStartX, thumbY, cfg.scrollbarWidth, thumbHeight, 3)
  g.fill({ color: isDraggingScrollbar ? 0x38bdf8 : 0x64748b })
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  const range = coordRange.value
  if (range.span <= 0) return

  const cfg = CONFIG.value
  const currentCoord = props.currentCoord
  const baseTick = Math.round(currentCoord.raw / cfg.stepCoord) * cfg.stepCoord
  const stepDelta = e.deltaY < 0 ? cfg.stepCoord : -cfg.stepCoord
  const targetCoord = Math.max(range.min, Math.min(range.max, baseTick + stepDelta))

  props.seekTo(targetCoord, 'coord')
}

const handleCanvasClick = (e: PIXI.FederatedPointerEvent) => {
  if (!app) return
  const range = coordRange.value
  if (range.span <= 0) return

  const cfg = CONFIG.value
  const viewWidth = app.screen.width
  const scrollbarStartX = viewWidth - cfg.scrollbarWidth - 2

  const clickX = e.global.x
  const clickY = e.global.y
  const button = e.button

  if (clickX >= scrollbarStartX - 6 && button === 0) {
    isDraggingScrollbar = true
    dragStartY = clickY
    dragStartCoord = props.currentCoord.raw
    return
  }

  const pointerState = getPointerGridState(clickX, clickY)

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
        shiftAnchorCoord.value = clickedCoord
        selectedCoords.value.clear()
        if (targetObs) {
          selectedCoords.value.add(Number(targetObs.Coord))
        }
      } else {
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

      if (selectedCoords.value.size > 0 && selectedObstacle.value) {
        appStore.selectedObstacle = null
      }
      return
    }

    selectedCoords.value.clear()
    shiftAnchorCoord.value = null
  }
}

const handlePointerMove = (e: PIXI.FederatedPointerEvent) => {
  if (!app) return
  const range = coordRange.value
  if (range.span <= 0) return

  const pointerState = getPointerGridState(e.global.x, e.global.y)
  hoverState.value = pointerState

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

  const thumbHeight = Math.max(30, (viewHeight / (range.span * rowHPerCoord)) * trackHeight)
  const availableTrackLength = trackHeight - thumbHeight

  const deltaY = e.global.y - dragStartY
  // 拖拽位移对应 raw 坐标变化
  const deltaCoord = -(deltaY / availableTrackLength) * range.span

  const rawTargetCoord = dragStartCoord + deltaCoord
  const snappedCoord = Math.round(rawTargetCoord / cfg.stepCoord) * cfg.stepCoord
  const targetCoord = Math.max(range.min, Math.min(range.max, snappedCoord))

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

useEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    if (selectedObstacle.value) {
      appStore.selectedObstacle = null
    }
  }
})

onMounted(() => {
  if (coordRange.value.span > 0) {
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