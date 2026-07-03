<template>
  <div class="tabs">
    <button
      v-for="view in VIEWS"
      :key="view.key"
      class="tab"
      :class="{ on: ui.activeView === view.key }"
      @click="ui.activeView = view.key"
    >
      {{ view.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui-store'
import type { ActiveView } from '@/stores/ui-store'

const ui = useUiStore()

const VIEWS: { key: ActiveView; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' }
]
</script>

<style scoped lang="sass">
.tabs
  display: flex
  gap: 2px
  background: transparent

.tab
  border: 2px solid transparent
  background: none
  color: $ink-3
  font-size: 14px
  font-weight: 500
  padding: 7px 13px
  border-radius: 999px
  display: flex
  align-items: center
  gap: 7px
  transition: .15s

  &:hover
    color: $ink

  &.on
    background: $btn
    border-color: transparent
    color: $ink
    font-weight: 700
</style>
