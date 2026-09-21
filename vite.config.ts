import path from 'path'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 自定义插件：在 isLocal 模式下，自动把源码里的 ?worker 拦截并加上 &inline
function autoInlineWorkerPlugin(enabled: boolean): Plugin {
  return {
    name: 'auto-inline-worker',
    enforce: 'pre',
    resolveId(source, importer, options) {
      if (!enabled) return null
      // 当匹配到 ?worker 但没有带 &inline 时，追加 &inline 标记
      if (source.includes('?worker') && !source.includes('&inline')) {
        const newSource = source.replace('?worker', '?worker&inline')
        return this.resolve(newSource, importer, { ...options, skipSelf: true })
      }
      return null
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLocal = mode === 'app-local'

  return {
    base: isLocal ? './' : process.env.NODE_ENV === 'production' ? '/r2beat-note/' : '/',

    // 配置 Worker 的打包输出格式
    worker: {
      // 在本地 file:// 打开模式下，worker 必须是 iife 格式
      format: isLocal ? 'iife' : 'es',
    },

    plugins: [
      // 自动将 ?worker 拦截为 ?worker&inline
      autoInlineWorkerPlugin(isLocal),
      vue(),
      tailwindcss(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [ElementPlusResolver()],
      }),
      isLocal && viteSingleFile(),
      VitePWA({
        disable: isLocal,
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
        manifest: {
          name: 'R2Beat Note',
          short_name: 'R2BeatNote',
          description: 'R2Beat Note Application',
          theme_color: '#f8fafc',
          background_color: '#f8fafc',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ].filter(Boolean),

    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
