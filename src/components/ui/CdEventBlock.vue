<template>
  <div
    class="cd-event-block"
    :class="{ 'cd-event-block--compact': compact }"
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
// Title: 700 16px. Start time (700 12px, opacity .8) is dropped on blocks shorter than
// MIN_HEIGHT_FOR_TIME, since a 30-minute event cannot hold both lines.
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

// A 16px title plus the time line needs roughly 40px, but a 30-minute event is only
// ~20px tall. Rather than force every block taller (which would make short events
// overlap their neighbours), the time line drops out when the block cannot hold both.
const MIN_HEIGHT_FOR_TIME = 38
const showTime = computed(() => props.height >= MIN_HEIGHT_FOR_TIME)

// Below this the block cannot fit a 16px title at its natural line height (19.2px plus
// 6px of padding needs 26px), so the title would be clipped mid-glyph. The compact
// variant drops it a step and tightens the leading instead of truncating.
const MIN_HEIGHT_FOR_FULL_TITLE = 26
const compact = computed(() => props.height < MIN_HEIGHT_FOR_FULL_TITLE)

const blockStyle = computed(() => ({
  position: 'absolute' as const,
  top: `${props.top}px`,
  height: `${Math.max(20, props.height)}px`,
  left: props.left,
  right: props.right,
  zIndex: 3 + props.lane,
  borderLeft: `3px solid ${props.color}`,
  background: props.active ? props.color : `color-mix(in srgb, ${props.color} 13%, var(--cd-surface-raised))`,
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
  font: 700 16px/1.2 var(--cd-font-title);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* A 30-minute event is 20px tall, leaving 14px between the 3px paddings, so the
   compact title has to fit within that rather than merely be smaller. */
.cd-event-block--compact .cd-event-block__title {
  font-size: 12px;
  line-height: 1.15;
}

.cd-event-block__time {
  font: 700 12px var(--cd-font-ui);
  font-variant-numeric: var(--cd-numeric-aligned);
  opacity: 0.8;
}
</style>
