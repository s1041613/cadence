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
    <div class="cd-month-grid__grid">
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
// Grid: 7-col, `grid-auto-rows` fixed (100px desk / 52px phone) so every cell is the same size
// regardless of event count or whether the month needs 5 or 6 weeks — cells clip overflow rather
// than growing, and the grid's own height is the natural sum of its rows (parent scrolls if it
// doesn't fit), only border-top divider (no vertical column lines).
import { computed } from 'vue'
import CdMonthCell, { type MonthCellEvent } from './CdMonthCell.vue'

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
    fmt?: 'time' | 'name' | 'dot'
    selectedDate?: string | null
  }>(),
  { fmt: 'time' }
)

const emit = defineEmits<{
  cellClick: [date: string, event: MouseEvent]
  eventClick: [date: string, event: MonthCellEvent, mouseEvent: MouseEvent]
  more: [date: string]
}>()

const DOW_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] // indexed by Date.getDay() (0=Sun..6=Sat)

const dowLabels = computed(() => props.cells.slice(0, 7).map((c) => ({ dow: c.dow, label: DOW_LETTERS[c.dow] })))
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
  padding-left: 6px;
  text-align: left;
  box-sizing: border-box;
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
  grid-auto-rows: 100px;
}

@media (max-width: 899px) {
  .cd-month-grid__grid {
    grid-auto-rows: 52px;
  }
}
</style>
