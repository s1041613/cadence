<template>
  <div
    class="tl-block"
    :class="{ fill: active, done: task.done, 'has-tex': theme.texture !== 'none' }"
    :style="{
      top: `${top}px`,
      height: `${height}px`,
      '--q': theme.backgroundColor,
      '--progress': `${progressPct}%`,
      borderLeftColor: theme.backgroundColor,
      '--tl-tex': textureBackgroundForCard(theme.texture, theme.backgroundColor)
    }"
    @click.stop="emit('open', task.id)"
  >
    <div v-if="theme.texture !== 'none'" class="tl-tex" />
    <div v-if="active" class="prog" />
    <button
      class="tl-check"
      :title="task.done ? '標為待進行' : '標為完成'"
      @click.stop="emit('toggle-done', task.id)"
    >
      <svg viewBox="0 0 16 16"><polyline points="3.5,8.5 6.5,11.5 12.5,4.5" /></svg>
    </button>
    <div class="btxt">
      <div class="bt">
        <span v-if="theme.icon" class="tl-glyph" v-html="theme.icon" />
        {{ task.title }}
      </div>
      <div class="bm mono">{{ task.start }}–{{ task.end }}{{ task.location ? ` · ${task.location}` : '' }}</div>
    </div>
    <div class="tl-tomato">
      <button class="tl-pombtn" title="開始番茄鐘專注" @click.stop="emit('focus', task.id)">
        <svg viewBox="0 0 24 24" v-html="TOMATO_SVG" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types/task'
import { themeOf, textureBackgroundForCard } from '@/composables/use-theme'
import { TOMATO_SVG } from '@/utils/tomato-icon'

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
  focus: [taskId: string]
}>()

const theme = computed(() => themeOf(props.task))
</script>

<style scoped lang="sass">
.tl-block
  position: absolute
  left: 0
  right: 0
  border-radius: 8px
  padding: 8px 12px 8px 10px
  overflow: hidden
  border: 1px solid $line
  border-left: 4px solid var(--q, #{$ink})
  background: $surface
  transition: .12s
  cursor: pointer
  display: grid
  grid-template-columns: 32px minmax(0, 1fr) 32px
  align-items: center
  column-gap: 10px

  &:hover
    border-color: color-mix(in srgb, var(--q, #{$ink}) 55%, $line)
    border-left-color: var(--q, #{$ink})

  &.fill
    background: color-mix(in srgb, var(--q, #{$ink}) 16%, #{$surface})
    border-color: color-mix(in srgb, var(--q, #{$ink}) 45%, #{$line})
    border-left-color: var(--q, #{$ink})
    animation: breathe 4s ease-in-out infinite

    .bt
      color: $ink
    .bm
      color: $ink-2
    .prog
      opacity: .95

  &.done
    opacity: .5

    .bt
      text-decoration: line-through

  &.fill::after
    content: ""
    position: absolute
    left: 0
    top: 0
    width: max(var(--progress, 0%), 12px)
    height: 3px
    z-index: 2
    background: var(--q, #{$ink})
    border-radius: 8px 0 3px 0
    pointer-events: none

  > .tl-tex
    position: absolute
    inset: 0
    pointer-events: none
    z-index: 0
    background: var(--tl-tex, none)
    opacity: .7
    border-radius: inherit

  > .btxt, > .tl-check, > .tl-tomato
    position: relative
    z-index: 3

  > .prog
    z-index: 1

.bt
  display: flex
  align-items: center
  min-width: 0
  font-size: 14px
  font-weight: 700
  line-height: 1.15
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis

.bm
  font-family: 'JetBrains Mono', ui-monospace, monospace
  font-size: 10.5px
  line-height: 1.2
  color: $ink-3
  margin-top: 2px

.btxt
  min-width: 0
  position: relative
  z-index: 3
  align-self: center
  display: flex
  flex-direction: column
  justify-content: center

.tl-glyph
  display: inline-flex
  flex: 0 0 auto
  margin-right: 5px
  line-height: 0

  :deep(svg)
    display: block
    width: 14px
    height: 14px

.tl-check
  grid-column: 1
  justify-self: center
  align-self: center
  width: 20px
  height: 20px
  border-radius: 50%
  border: 2.4px solid var(--q, #{$ink})
  background: none
  display: grid
  place-items: center
  cursor: pointer
  transition: .15s
  padding: 0
  position: relative
  z-index: 3
  line-height: 0
  flex: 0 0 auto

  svg
    width: 10px
    height: 10px
    stroke: #fff
    stroke-width: 2.6
    fill: none
    opacity: 0
    transition: .15s

  &:hover
    background: color-mix(in srgb, var(--q, #{$ink}) 14%, transparent)

.done .tl-check
  background: $green
  border-color: $green

  svg
    opacity: 1

.prog
  position: absolute
  left: 0
  top: 0
  bottom: 0
  width: var(--progress, 0%)
  z-index: 1
  min-width: 12px
  background: color-mix(in srgb, var(--q, #{$ink}) 34%, transparent)
  border-right: 1.6px solid var(--q, #{$ink})
  opacity: .82
  transition: width 1s linear
  pointer-events: none

.tl-tomato
  grid-column: 3
  align-self: center
  justify-self: center
  display: grid
  place-items: center
  width: 32px
  height: 32px
  z-index: 4

.tl-pombtn
  border: none
  background: none
  width: 26px
  height: 26px
  padding: 0
  line-height: 0
  cursor: pointer
  opacity: 0
  transition: .15s
  display: grid
  place-items: center

  svg
    display: block
    width: 24px
    height: 24px

  &:hover
    transform: scale(1.14) rotate(-4deg)
    opacity: 1

.tl-block:hover .tl-pombtn
  opacity: 1

.tl-block.fill .tl-pombtn
  opacity: 1

@keyframes breathe
  0%, 100%
    opacity: 1
  50%
    opacity: .82

@media (prefers-reduced-motion: reduce)
  .tl-block.fill
    animation: none
  .prog
    transition: none
</style>
