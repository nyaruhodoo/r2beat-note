import { markRaw, toRaw } from 'vue'

/**
 * 极轻量的递归 toRaw 解包函数（无内存分配、无深拷贝开销）
 */
export function deepToRaw<T>(val: T): T {
  const unwrapped = toRaw(val)
  if (
    !unwrapped ||
    typeof unwrapped !== 'object' ||
    unwrapped instanceof Blob ||
    unwrapped instanceof File
  ) {
    return unwrapped
  }

  if (Array.isArray(unwrapped)) {
    return unwrapped.map(deepToRaw) as unknown as T
  }

  const res: Record<string, any> = {}
  for (const key of Object.keys(unwrapped)) {
    res[key] = deepToRaw((unwrapped as Record<string, any>)[key])
  }
  return res as T
}

/**
 * 脱敏 File / Blob 对象，保留数组和对象的响应性
 */
export function sanitizeFile<T>(file: T): T {
  return file instanceof Blob || file instanceof File ? (markRaw(file) as T) : file
}

/**
 * 获取数值小数点精度
 */
export const getDecimalPlaces = (num: number) => {
  if (Math.floor(num) === num) return 0
  const str = num.toString()
  if (str.indexOf('.') !== -1) {
    return str.split('.')[1].length
  }
  return 0
}

/**
 * 数值转时间字符串
 */
export const formatTime = (s: number) => {
  if (!s || isNaN(s) || s < 0) return '00:00.000'
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, '0')
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, '0')
  const ms = Math.floor((s % 1) * 1000)
    .toString()
    .padStart(3, '0')
  return `${m}:${sec}.${ms}`
}

/**
 * 将 32 位 0xRRGGBBAA 数值转换为 CSS 兼容的 8位 Hex 字符串 (#RRGGBBAA)
 */
export const toCssHex8 = (color: number) => {
  return `#${(color >>> 0).toString(16).padStart(8, '0')}`
}

/**
 * 将 32 位 0xRRGGBBAA 数值高效解析为 Pixi.js 识别的 { color, alpha }
 */
export function parseColor(color32: number) {
  return {
    color: (color32 >>> 8) & 0xffffff,
    alpha: (color32 & 0xff) / 255,
  }
}

export function hslToHex(h: number, s: number, l: number): number {
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
