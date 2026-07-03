<template>
  <button class="inbox-btn" :class="{ on: ui.inboxOpen }" @click="ui.inboxOpen = !ui.inboxOpen">
    Inbox
  </button>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui-store'

const ui = useUiStore()
</script>

<style scoped lang="sass">
.inbox-btn
  border: none
  border-radius: 999px
  padding: 8px 18px
  font-size: 14px
  font-weight: 700
  color: $ink
  flex: none
  cursor: pointer
  transition: .15s
  background-color: $green
  background-image: radial-gradient(rgba(86, 88, 94, .30) 1px, transparent 1.3px)
  background-size: 7px 7px

  &:hover
    filter: brightness(.97)

  &.on
    box-shadow: inset 0 0 0 2px $ink
</style>
