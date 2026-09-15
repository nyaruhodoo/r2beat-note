<template>
  <div class="relative flex h-screen w-full flex-col overflow-hidden bg-slate-100 p-2 sm:p-6">
    <!-- 
      1. 顶栏 Header 区域 
    -->
    <div
      :class="[
        isMobile
          ? 'absolute top-0 right-0 left-0 z-30 p-4 transition-transform duration-300 ease-in-out'
          : 'mb-4 shrink-0',
        isMobile && !isHeaderOpen ? '-translate-y-full' : 'translate-y-0',
      ]"
    >
      <div>
        <slot name="header" />
      </div>

      <!-- 小屏专属：下拉小箭头按钮 -->
      <button
        v-if="isMobile && !isHeaderOpen"
        type="button"
        class="absolute -bottom-6 left-1/2 flex h-6 w-12 -translate-x-1/2 items-center justify-center rounded-b-lg bg-white/90 shadow-md backdrop-blur-sm"
        @click="isHeaderOpen = true"
      >
        <el-icon class="text-slate-600">
          <ArrowDown />
        </el-icon>
      </button>
    </div>

    <!-- 顶栏展开时的背景遮罩 -->
    <div
      v-if="isMobile && isHeaderOpen"
      class="fixed inset-0 z-20 bg-black/20 transition-opacity"
      @click="isHeaderOpen = false"
    />

    <!-- 
      2. 核心主体内容区域 
    -->
    <div class="relative flex min-h-0 flex-1 gap-4 overflow-hidden sm:gap-6">
      <!-- 小屏专属：左侧抽屉唤出悬浮按钮 -->
      <button
        v-if="isMobile && !isLeftDrawerOpen"
        type="button"
        class="fixed top-1/2 left-0 z-20 flex -translate-y-1/2 items-center rounded-r-lg border border-l-0 border-slate-200 bg-white/90 px-1.5 py-3 text-slate-700 shadow-md backdrop-blur-sm hover:bg-white"
        @click="isLeftDrawerOpen = true"
      >
        <el-icon class="text-lg"><Menu /></el-icon>
      </button>

      <!-- 
        左侧栏（核心修复点）：
        1. 移动端强制限制高度为屏幕高度：fixed top-0 bottom-0 h-screen max-h-screen
        2. 给抽屉容器加上 overflow-hidden，防止外层卡片变形溢出
      -->
      <div
        :class="[
          'transition-transform duration-300 ease-in-out',
          isMobile
            ? 'fixed top-0 bottom-0 left-0 z-40 box-border flex h-screen max-h-screen w-[85%] flex-col overflow-hidden p-4'
            : 'flex-colsm:bg-transparent flex min-h-0 flex-1',
          isMobile && !isLeftDrawerOpen ? '-translate-x-full' : 'translate-x-0',
        ]"
      >
        <!-- 真正的滚动区域：min-h-0 flex-1 overflow-y-auto 保证子元素超出时在卡片内部出现滚动条 -->
        <div class="min-h-0 flex-1 overflow-y-auto">
          <slot name="left" />
        </div>
      </div>

      <!-- 左侧抽屉遮罩层 -->
      <div
        v-if="isMobile && isLeftDrawerOpen"
        class="fixed inset-0 z-30 bg-black/40 transition-opacity"
        @click="isLeftDrawerOpen = false"
      />

      <!-- 中间：画布区域 -->
      <div class="shrink-0">
        <slot name="center" />
      </div>

      <!-- 右侧：配置区域 -->
      <div class="flex-1 overflow-y-auto">
        <slot name="right" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Menu, ArrowDown } from '@element-plus/icons-vue'
import { useMediaQuery } from '@vueuse/core'
import { ref, watch } from 'vue'

// 1200px 以下判定为移动端/小屏
const isMobile = useMediaQuery('(max-width: 1023px)')

const isLeftDrawerOpen = ref(false)
const isHeaderOpen = ref(false)

// 切换到桌面端时自动关闭移动端浮层
watch(isMobile, (mobile) => {
  if (!mobile) {
    isLeftDrawerOpen.value = false
    isHeaderOpen.value = false
  }
})
</script>
