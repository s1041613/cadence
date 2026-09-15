<template>
  <router-view />
</template>

<script setup lang="ts">
import { useAppSplash } from '@/composables/use-app-splash'

// Teardown for the launch screen (the screen itself is static CSS in index.html)
useAppSplash()
</script>
