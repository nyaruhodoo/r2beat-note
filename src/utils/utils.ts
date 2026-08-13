import { markRaw, toRaw } from 'vue'

export const getDecimalPlaces = (num: number) => {
  if (Math.floor(num) === num) return 0
  const str = num.toString()
  if (str.indexOf('.') !== -1) {
    return str.split('.')[1].length
  }
  return 0
}

// ⚡ 极轻量的递归 toRaw 解包函数（无内存分配、无深拷贝开销）
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

// 辅助函数：专门脱敏 File / Blob 对象，保留数组和对象的响应性
export function sanitizeFile<T>(file: T): T {
  return file instanceof Blob || file instanceof File ? (markRaw(file) as T) : file
}
