import mitt from 'mitt'

import type { GlobalConfig } from '@/store/global-config'

export type ShortcutEvents =
  | GlobalConfig['shortcutKey'][number]['event']
  | 'seekTo'
  | 'step-forward'
  | 'step-backward'
  | 'place-obstacle'
  | 'clear-obstacle'

// 这里我们假设所有通过快捷键触发的事件默认传参为 void（或者你可以根据需要扩展）
type Events = {
  [K in ShortcutEvents]: any
}

export const emitter = mitt<Events>()
