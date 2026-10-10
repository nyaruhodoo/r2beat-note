<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  document.addEventListener(
    'touchmove',
    function (e) {
      e.preventDefault()
    },
    { passive: false },
  )
})
</script>

<template>
  <RouterView />
</template>
