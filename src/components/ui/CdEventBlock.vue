<template>
  <div
    class="cd-event-block"
    :style="blockStyle"
    @click="(e) => { e.stopPropagation(); emit('click', e) }"
  >
    <div class="cd-event-block__title">{{ title }}</div>
    <div v-if="showTime" class="cd-event-block__time">{{ startLabel }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// CdEventBlock — absolutely-positioned time-grid event block. design-research-report.md §3.6.
// radius 7px, border-left 3px solid color, bg color-mix(color 13%, surface), padding 3px 8px.
// Title: 600 10.5px Zen Kaku. Height > 30px shows start time (8.5px mono, opacity .7).
// "In progress" (today + now within [start,end)): solid color fill + white text.
const props = defineProps<{
  title: string
  color: string
  top: number // px from grid top
  height: number // px
  left: string // CSS calc() or percentage string, from lane layout
  right: string
  lane: number
  startLabel: string
  active: boolean // true when this event is "in progress" (today + now within range)
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const showTime = computed(() => props.height > 30)

const blockStyle = computed(() => ({
  position: 'absolute' as const,
  top: `${props.top}px`,
  height: `${Math.max(20, props.height)}px`,
  left: props.left,
  right: props.right,
  zIndex: 3 + props.lane,
  borderLeft: `3px solid ${props.color}`,
  background: props.active ? props.color : `color-mix(in srgb, ${props.color} 13%, var(--cd-surface))`,
  color: props.active ? '#fff' : 'var(--cd-ink)'
}))
</script>

<style scoped>
.cd-event-block {
  cursor: pointer;
  box-sizing: border-box;
  border-radius: 7px;
  padding: 3px 8px;
  overflow: hidden;
}

.cd-event-block__title {
  font: 600 10.5px var(--cd-font-title);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cd-event-block__time {
  font: 8.5px var(--cd-font-mono);
  opacity: 0.7;
}
</style>
