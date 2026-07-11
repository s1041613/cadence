<template>
  <div class="cd-time-grid">
    <!-- Header row: sticky, day-of-week + day number (Week: 7 cols; Day: 1 col, hidden if hideHead). -->
    <div v-if="!hideHead" class="cd-time-grid__header" :style="{ gridTemplateColumns: gutterCols }">
      <div class="cd-time-grid__gutter-cell" />
      <div v-for="col in columns" :key="col.date" class="cd-time-grid__header-cell">
        <span class="cd-time-grid__header-dow" :class="{ 'cd-time-grid__header-dow--sat': col.dow === 6, 'cd-time-grid__header-dow--sun': col.dow === 0 }">
          {{ col.dowLabel }}
        </span>
        <span class="cd-time-grid__header-num" :class="{ 'cd-time-grid__header-num--today': col.today }">
          {{ col.dayNum }}
        </span>
      </div>
    </div>

    <!-- All-day bar: always present, even empty (min-height 24px). -->
    <div class="cd-time-grid__allday" :style="{ gridTemplateColumns: gutterCols }">
      <div class="cd-time-grid__gutter-cell cd-time-grid__gutter-cell--allday">All-day</div>
      <div v-for="col in columns" :key="col.date" class="cd-time-grid__allday-cell">
        <div
          v-for="ev in col.allDayEvents"
          :key="ev.id"
          class="cd-time-grid__allday-item"
          :style="{
            background: `color-mix(in srgb, ${ev.color} 16%, var(--cd-surface))`,
            color: `color-mix(in srgb, ${ev.color} 70%, var(--cd-ink))`,
            borderLeftColor: ev.color
          }"
          @click="(e) => emit('eventClick', col.date, ev.id, e)"
        >
          {{ ev.title }}
        </div>
      </div>
    </div>

    <!-- Scrollable body: hour lines, column dividers, absolutely-positioned event blocks, now line. -->
    <div class="cd-time-grid__body" :style="{ gridTemplateColumns: gutterCols, height: `${totalHeight}px` }">
      <div class="cd-time-grid__gutter">
        <span
          v-for="h in hours"
          :key="h"
          class="cd-time-grid__hour-label"
          :style="{ top: `${top(h * 60) + 2}px` }"
        >
          {{ hourLabel(h) }}
        </span>
      </div>
      <div
        v-for="col in columns"
        :key="col.date"
        class="cd-time-grid__column"
        @click="(e) => onColumnClick(col.date, e)"
      >
        <div v-for="h in hours" :key="h" class="cd-time-grid__hour-line" :style="{ top: `${top(h * 60)}px` }" />
        <div
          v-if="col.today"
          class="cd-time-grid__now-line"
          :style="{ top: `${top(nowMinutes)}px` }"
        >
          <span class="cd-time-grid__now-dot" />
        </div>
        <CdEventBlock
          v-for="block in laidOutBlocks(col)"
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
          @click="(e) => emit('eventClick', col.date, block.id, e)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CdEventBlock from './CdEventBlock.vue'
import { assignLanes } from '@/utils/timeline-lanes'
import { formatTime, type TimeFormatName } from '@/utils/convert-date-time'

// CdTimeGrid — shared Week/Day time grid. design-research-report.md §3.6.
// Range 6:00-23:00 (START=6, END=23). Gutter 50px. Hour lines rgba(86,88,94,.08); column dividers
// rgba(86,88,94,.08); header underline rgba(86,88,94,.12). Sticky header z-index 6, all-day bar always
// shown. Now line: 1.5px solid #C0564B + 7px dot, z-index 5. Overlap lanes via timeline-lanes.ts.
export interface TimeGridEvent {
  id: string
  title: string
  color: string
  start: number // minutes from midnight
  end: number
  allDay: boolean
}

export interface TimeGridColumn {
  date: string
  dow: number
  dowLabel: string
  dayNum: number
  today: boolean
  events: TimeGridEvent[]
  allDayEvents: Array<{ id: string; title: string; color: string }>
}

const START_HOUR = 6
const END_HOUR = 23

const props = withDefaults(
  defineProps<{
    columns: TimeGridColumn[]
    /** Row height in px per hour; desk Week=44, Day=52. */
    rowHeight?: number
    hideHead?: boolean
    /** "Now" in minutes-from-midnight, for the now-indicator line. Pure ui layer takes no implicit
     * clock (design.md "Pure presentational ui layer with feature-layer composition") — the caller
     * derives this from the shared `useCurrentTime()` singleton and passes it down every tick. */
    nowMinutes: number
    /** user-settings spec "Time format applies to displayed times" — governs each event block's
     * start-time label. The hour-gutter itself always shows plain 24-hour numbers per the design. */
    timeFormat?: TimeFormatName
  }>(),
  { rowHeight: 44, hideHead: false, timeFormat: '24-Hour' }
)

const emit = defineEmits<{
  eventClick: [date: string, eventId: string, event: MouseEvent]
  /** Empty-column click; `minutesFromMidnight` is the raw (unrounded) clicked position — the
   * feature-layer caller applies quickAddTimeRange() rounding/clamping (design.md "5.1"). */
  columnClick: [date: string, minutesFromMidnight: number, event: MouseEvent]
}>()

const hours = computed(() => {
  const arr: number[] = []
  for (let h = START_HOUR; h <= END_HOUR; h++) arr.push(h)
  return arr
})

const totalHeight = computed(() => (END_HOUR - START_HOUR) * props.rowHeight)

function top(minutes: number): number {
  return ((minutes - START_HOUR * 60) / 60) * props.rowHeight
}

function onColumnClick(date: string, e: MouseEvent): void {
  // Ignore clicks on event blocks/now-line — they stop propagation via their own @click handlers
  // (CdEventBlock) except the now-line, which is pointer-events:none in its stylesheet already.
  if (e.target !== e.currentTarget) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const y = e.clientY - rect.top
  const clickedMinutes = START_HOUR * 60 + (y / props.rowHeight) * 60
  emit('columnClick', date, clickedMinutes, e)
}

const gutterCols = computed(() => `50px repeat(${props.columns.length}, 1fr)`)

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
}

function laidOutBlocks(col: TimeGridColumn): LaidOutBlock[] {
  const timed = col.events.filter((e) => !e.allDay)
  const layout = assignLanes(timed.map((e) => ({ id: e.id, s: e.start, e: e.end })))
  const gap = 3
  return timed.map((ev) => {
    const l = layout[ev.id] ?? { lane: 0, cols: 1 }
    const wPct = 100 / l.cols
    const left = `calc(${wPct * l.lane}% + ${l.lane === 0 ? 3 : gap}px)`
    const right = `calc(${wPct * (l.cols - 1 - l.lane)}% + ${l.lane === l.cols - 1 ? 3 : gap}px)`
    const active = col.today && props.nowMinutes >= ev.start && props.nowMinutes < ev.end
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
      startLabel: minutesToLabel(ev.start),
      active
    }
  })
}

function minutesToLabel(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return formatTime(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, props.timeFormat)
}

function hourLabel(h: number): string {
  return String(h).padStart(2, '0')
}
</script>

<style scoped>
.cd-time-grid {
  display: flex;
  flex-direction: column;
  background: var(--cd-surface);
}

.cd-time-grid__header {
  display: grid;
  position: sticky;
  top: 0;
  z-index: 6;
  background: var(--cd-surface);
  border-bottom: 1px solid rgba(86, 88, 94, 0.12);
}

.cd-time-grid__gutter-cell {
  flex: none;
}

.cd-time-grid__header-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 11px 0 10px;
}

.cd-time-grid__header-dow {
  font: 600 10.5px var(--cd-font-ui);
  letter-spacing: 0.14em;
  color: var(--cd-ink-2);
}

.cd-time-grid__header-dow--sat {
  color: var(--cd-sat);
}

.cd-time-grid__header-dow--sun {
  color: var(--cd-sun);
}

.cd-time-grid__header-num {
  font: 700 18px var(--cd-font-mono);
  color: var(--cd-ink);
}

.cd-time-grid__header-num--today {
  background: var(--cd-olive);
  color: #3f4136;
  border-radius: var(--cd-radius-pill);
  padding: 1px 8px;
}

.cd-time-grid__allday {
  display: grid;
  min-height: 24px;
  border-bottom: 1px solid rgba(86, 88, 94, 0.12);
}

.cd-time-grid__gutter-cell--allday {
  font: 8px var(--cd-font-mono);
  color: var(--cd-muted);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 6px;
}

.cd-time-grid__allday-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 4px 3px;
  border-left: 1px solid rgba(86, 88, 94, 0.08);
}

.cd-time-grid__allday-item {
  border-left: 3px solid;
  border-radius: 5px;
  font: 600 8.5px var(--cd-font-ui);
  padding: 2px 6px;
}

.cd-time-grid__body {
  display: grid;
  position: relative;
}

.cd-time-grid__gutter {
  position: relative;
}

.cd-time-grid__hour-label {
  position: absolute;
  right: 8px;
  font: 9.5px var(--cd-font-mono);
  color: var(--cd-muted);
  text-align: right;
}

.cd-time-grid__column {
  position: relative;
  border-left: 1px solid rgba(86, 88, 94, 0.08);
}

.cd-time-grid__hour-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px solid rgba(86, 88, 94, 0.08);
}

.cd-time-grid__now-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1.5px solid var(--cd-sun);
  z-index: 5;
}

.cd-time-grid__now-dot {
  position: absolute;
  left: -4px;
  top: -3.5px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cd-sun);
}
</style>
