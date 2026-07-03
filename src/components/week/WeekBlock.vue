<template>
  <div
    class="wblock"
    :class="{ fill: active, done: task.done }"
    :style="{
      top: `${top}px`,
      height: `${height}px`,
      '--task-bg': theme.backgroundColor,
      '--task-ink': theme.textColor,
      borderLeft: `4px solid ${theme.backgroundColor}`
    }"
    :title="task.title"
    @click.stop="emit('open', task.id)"
  >
    <div v-if="active" class="wb-prog" :style="{ width: `${progressPct}%` }" />
    <button class="wb-check" :title="task.done ? '標為待進行' : '標為完成'" @click.stop="emit('toggle-done', task.id)">
      <svg viewBox="0 0 16 16"><polyline points="3.5,8.5 6.5,11.5 12.5,4.5" /></svg>
    </button>
    <div class="wb-copy">
      <div class="wb-t">{{ task.title }}</div>
      <div class="wb-m mono">{{ task.start }}–{{ task.end }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types/task'
import { themeOf } from '@/composables/use-theme'

const props = defineProps<{
  task: Task
  top: number
  height: number
  active: boolean
  progressPct: number
}>()

const emit = defineEmits<{
  open: [taskId: string]
  'toggle-done': [taskId: string]
}>()

const theme = computed(() => themeOf(props.task))
</script>

<style scoped lang="sass">
.wblock
  position: absolute
  left: 3px
  right: 3px
  border-radius: 6px
  background: $surface
  color: $ink
  padding: 4px 7px 4px 20px
  overflow: hidden
  cursor: pointer
  border: 1px solid $line
  transition: .12s

  &:hover
    border-color: $ink

  &.fill
    background: color-mix(in srgb, var(--task-bg, #{$ink}) 18%, #{$surface})
    border-color: var(--task-bg, #{$ink})
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--task-bg, #{$ink}) 18%, transparent)

    .wb-t
      color: $ink
    .wb-m
      color: $ink-2

    .wb-check
      border-color: color-mix(in srgb, var(--task-bg, #{$ink}) 58%, #{$ink})
      background: color-mix(in srgb, #{$surface} 88%, var(--task-bg, #{$ink}))

  &.done
    opacity: .45
    text-decoration: line-through

.wb-copy
  position: relative
  z-index: 2
  min-width: 0

.wb-t
  font-size: 10.5px
  font-weight: 700
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis
  line-height: 1.25

.wb-m
  font-family: 'JetBrains Mono', ui-monospace, monospace
  font-size: 8.5px
  color: $ink-3
  margin-top: 1px

.wb-check
  position: absolute
  left: 4px
  top: 4px
  width: 12px
  height: 12px
  border-radius: 50%
  border: 1.6px solid $ink-3
  background: none
  display: grid
  place-items: center
  cursor: pointer
  padding: 0
  line-height: 0
  z-index: 2

  svg
    width: 7px
    height: 7px
    stroke: #fff
    stroke-width: 3
    fill: none
    opacity: 0

.done .wb-check
  background: $green
  border-color: $green

  svg
    opacity: 1

.wb-prog
  position: absolute
  left: 0
  top: 0
  bottom: 0
  width: 0
  background: color-mix(in srgb, var(--task-bg, #{$ink}) 34%, transparent)
  border-right: 1.5px solid var(--task-bg, #{$ink})
  transition: width 1s linear
  pointer-events: none

@media (prefers-reduced-motion: reduce)
  .wb-prog
    transition: none
</style>
