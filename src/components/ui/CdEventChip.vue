<template>
  <div
    class="cd-event-chip"
    :class="{ 'cd-event-chip--solid': solid, 'cd-event-chip--done': done }"
    :style="chipStyle"
    @click="emit('click', $event)"
  >
    <template v-if="fmt === 'dot'">
      <span class="cd-event-chip__dot" :style="{ background: color }" />
    </template>
    <template v-else-if="fmt === 'name'">
      <span class="cd-event-chip__mini-icon" v-html="quadIcon" />
      <span class="cd-event-chip__label">{{ title }}</span>
    </template>
    <template v-else>
      {{ timeLabel }}
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// CdEventChip — month cell event chip. design-research-report.md §3.5:
//  - fmt='time'/'name': font 600 9.5px (time uses mono, name uses Zen Kaku); radius 6px; padding 1px 5px; border 1px solid quadColor.
//  - all-day = solid fill (bg=color, text=white); timed = outline (border+text=color, transparent bg).
//  - done: line-through + opacity .5.
//  - fmt='name': 10px quadrant mini-icon (do=check, plan=flag, quick=bolt, later=moon, event=star) + title.
//  - fmt='dot': cell shows only a 5px colored dot (max 4 per cell, enforced by the parent CdMonthCell).
const MINI_ICONS: Record<string, string> = {
  do: '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  plan: '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V3a1 1 0 011-1h13l-2 5 2 5H6"/></svg>',
  quick: '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  later: '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/></svg>',
  event: '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9.3 16.7 14 18.5 21 12 17.1 5.5 21 7.3 14 2 9.3 9 9 12 2"/></svg>'
}

const props = defineProps<{
  title: string
  color: string
  quad: 'do' | 'plan' | 'quick' | 'later' | 'event'
  time: string | null // null = all-day
  allDay: boolean
  done: boolean
  fmt: 'time' | 'name' | 'dot'
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const solid = computed(() => props.allDay)
const quadIcon = computed(() => MINI_ICONS[props.quad] ?? MINI_ICONS.event)
const timeLabel = computed(() => (props.allDay ? `All-day ${props.title}` : `${props.time} ${props.title}`))

const chipStyle = computed(() => ({
  background: props.fmt === 'dot' ? 'transparent' : solid.value ? props.color : 'transparent',
  color: props.fmt === 'dot' ? undefined : solid.value ? '#fff' : props.color,
  border: props.fmt === 'dot' ? 'none' : `1px solid ${props.color}`,
  fontFamily: props.fmt !== 'name' && props.time ? 'var(--cd-font-mono)' : 'var(--cd-font-title)'
}))
</script>

<style scoped>
.cd-event-chip {
  cursor: pointer;
  align-self: stretch;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 9.5px;
  font-weight: 600;
  line-height: 1.3;
  border-radius: var(--cd-radius-xs);
  padding: 1px 5px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cd-event-chip--done {
  text-decoration: line-through;
  opacity: 0.5;
}

.cd-event-chip__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex: none;
}

.cd-event-chip__mini-icon {
  display: flex;
  flex: none;
}

.cd-event-chip__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
