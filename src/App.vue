<template>
  <router-view />
</template>

<script setup lang="ts">
import { useAppSplash } from '@/composables/use-app-splash'

// Teardown for the launch animation (the animation itself is pure CSS in index.html)
useAppSplash()
</script>
