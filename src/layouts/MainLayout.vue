<template>
  <q-layout view="lHh Lpr lFf" class="app-layout">
    <q-page-container class="app-page-container">
      <router-view />
    </q-page-container>
    <!-- Mounted outside q-page-container so a route change cannot unmount a running
         session. This is the only mount point; pages must not add their own. -->
    <FocusSession v-if="focus.state" />
  </q-layout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useFocusStore } from '@/stores/focus-store'
import FocusSession from '@/components/focus/FocusSession.vue'

const focus = useFocusStore()

onMounted(() => {
  focus.rehydrate()
})
</script>

<style scoped lang="sass">
.app-layout,
.app-page-container
  width: 100%
  min-height: 100dvh
</style>
