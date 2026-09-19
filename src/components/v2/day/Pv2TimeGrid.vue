<template>
  <div class="pv2-grid">
    <!-- ALL-DAY row: always present, even empty. Sits above the rule, outside the scroll area. -->
    <div class="pv2-grid__allday">
      <span class="pv2-grid__allday-label">ALL-DAY</span>
      <div class="pv2-grid__allday-items">
        <button
          v-for="ev in allDayEvents"
          :key="ev.id"
          type="button"
          class="pv2-grid__chip"
          :style="{ background: tint(ev.color), borderLeftColor: ev.color }"
          @click="(e) => emit('eventClick', ev.id, e)"
        >
          {{ ev.title }}
        </button>
      </div>
    </div>

    <div class="pv2-grid__rule" />

    <!-- Scrollable body: hour lines, absolutely-positioned event blocks, now line. -->
    <div ref="scrollEl" class="pv2-grid__scroll">
      <div class="pv2-grid__body" :style="{ height: `${totalHeight}px` }">
        <div class="pv2-grid__gutter">
          <span
            v-for="h in hours"
            :key="h"
            class="pv2-grid__hour-label"
            :class="{ 'pv2-grid__hour-label--now': isCurrentHour(h) }"
            :style="{ top: `${top(h * 60) - HOUR_LABEL_H / 2}px` }"
          >
            {{ hourLabel(h) }}
          </span>
        </div>

        <div class="pv2-grid__column" @click="onColumnClick">
          <div
            v-for="h in hours"
            :key="h"
            class="pv2-grid__hour-line"
            :style="{ top: `${top(h * 60)}px` }"
          />

          <div v-if="today" class="pv2-grid__now-line" :style="{ top: `${top(nowMinutes)}px` }">
            <span class="pv2-grid__now-dot" />
          </div>

          <Pv2EventBlock
            v-for="block in laidOutBlocks"
            :key="block.id"
            :title="block.title"
            :color="block.color"
            :top="block.top"
            :height="block.height"
            :left="block.left"
            :right="block.right"
            :lane="block.lane"
            :start-label="block.startLabel"
            :active="block.active"
            :is-task="block.isTask"
            :done="block.done"
            :can-toggle="block.canToggle"
            :subtasks="block.subtasks"
            :location="block.location"
            :notes="block.notes"
            :remaining-label="block.remainingLabel"
            @click="(e) => emit('eventClick', block.id, e)"
            @toggle-done="emit('toggleDone', block.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Pv2EventBlock from './Pv2EventBlock.vue'
import { assignLanes } from '@/utils/timeline-lanes'
import { formatTime, type TimeFormatName } from '@/utils/convert-date-time'
import type { Subtask } from '@/types/subtask'

// Pv2TimeGrid — v2 day time grid, copied from the shared CdTimeGrid (which Week still uses).
// The geometry is carried over verbatim: same 06:00-23:00 range, same top()/height maths, same
// assignLanes() overlap columns. Only the chrome differs — single column (Day never needs the
// week header), and a neutral palette hardcoded rather than drawn from the warm --cd-* tokens,
// which must not reach v2.
export interface Pv2GridEvent {
  id: string
  title: string
  color: string
  start: number // minutes from midnight
  end: number
  /** Completion, for the block's checkbox. Only a quadrant task carries one; an event omits
   *  these and is drawn exactly as it was before the checkbox existed. */
  isTask?: boolean
  done?: boolean
  canToggle?: boolean
  /** Rendered inline so a block's intent is readable without opening it. Optional: callers
   *  that have no checklist to show simply omit it. */
  subtasks?: Subtask[]
  /** Same contract as subtasks: extra detail a tall block fills its height with, dropped
   *  silently when the block has no room for it. */
  location?: string
  notes?: string
}

export interface Pv2GridAllDayEvent {
  id: string
  title: string
  color: string
}

const START_HOUR = 6
const END_HOUR = 23

// Hour label line box, kept in sync with .pv2-grid__hour-label's line-height. The label is
// absolutely positioned, so it is shifted up by half this to sit centred on its hour line;
// hardcoding the offset silently mis-centres the text whenever the font size changes.
const HOUR_LABEL_H = 14

// Opening position. The axis is 06:00-23:00 so an unscrolled grid would open on three empty
// early-morning hours; 08:00 puts the working day at the top while leaving the earlier hours
// reachable by scrolling up.
const INITIAL_SCROLL_HOUR = 8

const props = withDefaults(
  defineProps<{
    events: Pv2GridEvent[]
    allDayEvents: Pv2GridAllDayEvent[]
    /** Row height in px per hour. */
    rowHeight?: number
    /** True when the rendered date is today — gates the now line and the in-progress state. */
    today: boolean
    /** "Now" in minutes-from-midnight. Derived by the caller from useCurrentTime(). */
    nowMinutes: number
    timeFormat?: TimeFormatName
  }>(),
  { rowHeight: 68, timeFormat: '24-Hour' }
)

const emit = defineEmits<{
  eventClick: [eventId: string, event: MouseEvent]
  /** The block's checkbox was tapped. The grid does not own the data, so it only reports
   *  which row — the caller flips it. */
  toggleDone: [eventId: string]
  /** Empty-column click; `minutesFromMidnight` is the raw (unrounded) clicked position — the
   * caller applies quickAddTimeRange() rounding/clamping. */
  columnClick: [minutesFromMidnight: number, event: MouseEvent]
}>()

const scrollEl = ref<HTMLElement | null>(null)

onMounted(() => {
  if (scrollEl.value) scrollEl.value.scrollTop = top(INITIAL_SCROLL_HOUR * 60)
})

const hours = computed(() => {
  const arr: number[] = []
  for (let h = START_HOUR; h <= END_HOUR; h++) arr.push(h)
  return arr
})

const totalHeight = computed(() => (END_HOUR - START_HOUR) * props.rowHeight)

function top(minutes: number): number {
  return ((minutes - START_HOUR * 60) / 60) * props.rowHeight
}

function isCurrentHour(h: number): boolean {
  return props.today && Math.floor(props.nowMinutes / 60) === h
}

function onColumnClick(e: MouseEvent): void {
  // Ignore clicks on event blocks — they stop propagation in Pv2EventBlock. The now line is
  // pointer-events:none in the stylesheet below.
  if (e.target !== e.currentTarget) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const y = e.clientY - rect.top
  const clickedMinutes = START_HOUR * 60 + (y / props.rowHeight) * 60
  emit('columnClick', clickedMinutes, e)
}

interface LaidOutBlock {
  id: string
  title: string
  color: string
  top: number
  height: number
  left: string
  right: string
  lane: number
  startLabel: string
  active: boolean
  isTask: boolean
  done: boolean
  canToggle: boolean
  subtasks: Subtask[]
  location: string
  notes: string
  /** Non-empty only while the block is in progress. The grid owns nowMinutes, so the
   *  countdown is computed here rather than re-deriving "now" inside every block. */
  remainingLabel: string
}

const laidOutBlocks = computed<LaidOutBlock[]>(() => {
  const layout = assignLanes(props.events.map((e) => ({ id: e.id, s: e.start, e: e.end })))
  const gap = 3
  return props.events.map((ev) => {
    const l = layout[ev.id] ?? { lane: 0, cols: 1 }
    const wPct = 100 / l.cols
    const left = `calc(${wPct * l.lane}% + ${l.lane === 0 ? 3 : gap}px)`
    const right = `calc(${wPct * (l.cols - 1 - l.lane)}% + ${l.lane === l.cols - 1 ? 3 : gap}px)`
    // `&& !done` so a task finished early stops being "in progress": the ring and the
    // countdown both hang off this, and "18 min left" under a struck-through title is a
    // contradiction the user has already resolved by checking it.
    const done = ev.done ?? false
    const active =
      props.today && props.nowMinutes >= ev.start && props.nowMinutes < ev.end && !done
    const h = ((ev.end - ev.start) / 60) * props.rowHeight - 2
    return {
      id: ev.id,
      title: ev.title,
      color: ev.color,
      top: top(ev.start),
      height: h,
      left,
      right,
      lane: l.lane,
      startLabel: `${minutesToLabel(ev.start)} – ${minutesToLabel(ev.end)}`,
      active,
      isTask: ev.isTask ?? false,
      done,
      canToggle: ev.canToggle ?? true,
      subtasks: ev.subtasks ?? [],
      location: ev.location ?? '',
      notes: ev.notes ?? '',
      remainingLabel: active ? remainingLabel(ev.end - props.nowMinutes) : ''
    }
  })
})

function minutesToLabel(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return formatTime(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, props.timeFormat)
}

function hourLabel(h: number): string {
  return String(h).padStart(2, '0')
}

/**
 * How long the in-progress block still has to run.
 *
 * Deliberately not fmtDur(), the app's duration helper: it renders a part-hour as a decimal
 * ("1.7 hr"), which is fine for an estimate someone is comparing but unreadable as a countdown
 * — nobody reads their own shift as 1.7 hours. Whole units, and no unit that is zero.
 */
function remainingLabel(minutesLeft: number): string {
  const m = Math.max(0, Math.round(minutesLeft))
  if (m < 60) return `${m} min left`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h} hr left` : `${h} hr ${rem} min left`
}

// ALL-DAY chip fill = a wash of the event colour, mixed against v2 paper rather than the warm
// --cd-surface-raised the legacy grid uses.
function tint(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return 'rgba(var(--pv2-ink-rgb), 0.08)'
  const n = parseInt(m[1]!, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, 0.16)`
}
</script>

<style scoped>
.pv2-grid {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
}

/* ALL-DAY row */
.pv2-grid__allday {
  flex: none;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 30px;
}

.pv2-grid__allday-label {
  flex: none;
  width: 58px;
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.12em;
  color: var(--pv2-ink-3);
}

.pv2-grid__allday-items {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pv2-grid__chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border: none;
  border-left: 3px solid;
  border-radius: 10px;
  font: 600 14px var(--cd-font-ui);
  color: var(--pv2-ink);
  cursor: pointer;
}

/* Separates the all-day strip from the axis. Kept a step heavier than the hour lines so it
   still reads as a section boundary, but well short of the near-black rule it replaces. */
.pv2-grid__rule {
  flex: none;
  height: 1px;
  background: rgba(var(--pv2-ink-rgb), 0.16);
  margin: 12px 0 0;
}

/* Scroll area */
.pv2-grid__scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.pv2-grid__scroll::-webkit-scrollbar {
  display: none;
}

.pv2-grid__body {
  display: grid;
  grid-template-columns: 58px 1fr;
  gap: 16px;
  position: relative;
  padding-top: 12px;
}

.pv2-grid__gutter {
  position: relative;
}

.pv2-grid__hour-label {
  position: absolute;
  left: 0;
  /* line-height pinned so HOUR_LABEL_H can centre the label on its hour line */
  font: 500 12px/14px var(--cd-font-ui);
  font-variant-numeric: var(--cd-numeric-aligned);
  letter-spacing: 0.02em;
  color: var(--pv2-ink-3);
}

.pv2-grid__hour-label--now {
  color: #a8443c;
}

.pv2-grid__column {
  position: relative;
}

.pv2-grid__hour-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px solid rgba(var(--pv2-ink-rgb), 0.07);
}

.pv2-grid__now-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1.5px solid #a8443c;
  z-index: 5;
  pointer-events: none;
}

.pv2-grid__now-dot {
  position: absolute;
  left: -4px;
  top: -4.5px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #a8443c;
}
</style>
