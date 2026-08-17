import path from 'path'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
    VitePWA({
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
            src: 'pwa-192x192.png', // 请确保 public 目录下存在对应的图片文件
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png', // 请确保 public 目录下存在对应的图片文件
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: process.env.NODE_ENV === 'production' ? '/r2beat-note/' : '/',
})
