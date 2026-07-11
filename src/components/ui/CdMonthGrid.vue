<template>
  <div class="cd-month-grid">
    <div class="cd-month-grid__dow-row">
      <span
        v-for="(d, i) in dowLabels"
        :key="i"
        class="cd-month-grid__dow"
        :class="{ 'cd-month-grid__dow--sat': d.dow === 6, 'cd-month-grid__dow--sun': d.dow === 0 }"
      >
        {{ d.label }}
      </span>
    </div>
    <div ref="gridEl" class="cd-month-grid__grid">
      <CdMonthCell
        v-for="cell in cells"
        :key="cell.date"
        :day-num="cell.dayNum"
        :dow="cell.dow"
        :outside-month="cell.outsideMonth"
        :today="cell.today"
        :selected="cell.date === selectedDate"
        :events="cell.events"
        :fmt="fmt"
        :max-chips="maxChips"
        @click="(e) => emit('cellClick', cell.date, e)"
        @event-click="(ev, e) => emit('eventClick', cell.date, ev, e)"
        @more="emit('more', cell.date)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// CdMonthGrid — 7-column month grid, matching CADENCE Handoff.dc.html's monthPoster() dow row
// (['M','T','W','T','F','S','S']) — the salvage-branch design-research-report.md §2.3/§3.5 cited a
// Sunday-start header from an earlier revision; re-pinned to the handoff during task 3.1's audit.
// Column start re-anchors with the user-settings firstDay preference (task 7.2 "First day of week
// re-anchors all week-based layouts") — the header derives its labels and Sat/Sun highlight from
// `cells[0..6].dow` rather than a hardcoded Monday-start array, so this component stays a pure
// function of the cells it's given instead of duplicating the firstDay concept into a second prop.
// Weekday header: 10.5px 600 letter-spacing .14em, Sat=#3A6EA5, Sun=#C0564B.
// Grid: 7-col; every cell is the same size regardless of event count. Rows use a readable floor
// and the parent scrolls if the month doesn't fit, which keeps the phone month view grid-first
// instead of compressing cells to make room for a permanent agenda split. Only border-top divider
// (no vertical column lines).
// A single ResizeObserver measures the grid's height to derive the per-row budget, and
// `maxChips` tells each CdMonthCell how many chips fit that budget — the constants below must
// mirror CdMonthCell's cell padding/gap/day-number box and CdEventChip's chip height per
// breakpoint.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CdMonthCell, { type MonthCellEvent } from './CdMonthCell.vue'
import { useBreakpoint } from '@/composables/use-breakpoint'

export interface MonthGridCell {
  date: string
  dayNum: number
  dow: number
  outsideMonth: boolean
  today: boolean
  events: MonthCellEvent[]
}

const props = withDefaults(
  defineProps<{
    cells: MonthGridCell[]
    fmt?: 'name' | 'icon' | 'dot'
    selectedDate?: string | null
  }>(),
  { fmt: 'name' }
)

const emit = defineEmits<{
  cellClick: [date: string, event: MouseEvent]
  eventClick: [date: string, event: MonthCellEvent, mouseEvent: MouseEvent]
  more: [date: string]
}>()

const DOW_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] // indexed by Date.getDay() (0=Sun..6=Sat)

const dowLabels = computed(() => props.cells.slice(0, 7).map((c) => ({ dow: c.dow, label: DOW_LETTERS[c.dow] })))

// Per-breakpoint cell chrome sizes (px), mirroring CdMonthCell/CdEventChip CSS: vertical cell
// padding (both edges), head→events gap, day-number box height, chip height, chip gap.
const CELL_METRICS = {
  desktop: { cellPad: 16, headGap: 3, headH: 26, chipH: 16.5, chipGap: 2 },
  phone: { cellPad: 6, headGap: 1, headH: 20, chipH: 15, chipGap: 2 }
} as const

const { isDesktop } = useBreakpoint()
const gridEl = ref<HTMLElement | null>(null)
const gridHeight = ref(0)
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    gridHeight.value = entries[0]?.contentRect.height ?? 0
  })
  if (gridEl.value) resizeObserver.observe(gridEl.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())

const weekCount = computed(() => Math.max(1, Math.round(props.cells.length / 7)))

const maxChips = computed(() => {
  if (gridHeight.value <= 0) return 3 // pre-measure fallback: preserve the month-cell density floor
  const m = isDesktop.value ? CELL_METRICS.desktop : CELL_METRICS.phone
  const rowH = gridHeight.value / weekCount.value
  const availH = rowH - m.cellPad - m.headGap - m.headH
  return Math.max(1, Math.floor((availH + m.chipGap) / (m.chipH + m.chipGap)))
})
</script>

<style scoped>
.cd-month-grid {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--cd-surface);
}

.cd-month-grid__dow-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 8px 0;
}

.cd-month-grid__dow {
  /* Centered over its column, matching the handoff mockup (monthPoster dow row uses
     textAlign:center) and CdMonthCell's centered day number below. */
  text-align: center;
  font: 600 10.5px var(--cd-font-ui);
  letter-spacing: 0.14em;
  color: var(--cd-muted);
}

.cd-month-grid__dow--sat {
  color: var(--cd-sat);
}

.cd-month-grid__dow--sun {
  color: var(--cd-sun);
}

.cd-month-grid__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 112px;
}

@media (max-width: 899px) {
  .cd-month-grid {
    height: auto;
    min-height: 100%;
  }

  .cd-month-grid__grid {
    /* The phone grid is allowed to scroll as a month-first surface; this row floor usually permits
       more than 3 visible events, with +N reserved for true overflow. */
    grid-auto-rows: minmax(112px, auto);
  }
}
</style>
