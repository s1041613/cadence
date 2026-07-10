<template>
  <div class="cd-month-grid">
    <div class="cd-month-grid__dow-row">
      <span
        v-for="(d, i) in dowLabels"
        :key="d"
        class="cd-month-grid__dow"
        :class="{ 'cd-month-grid__dow--sat': i === 5, 'cd-month-grid__dow--sun': i === 6 }"
      >
        {{ d }}
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
        :events="cell.events"
        :fmt="fmt"
        @click="emit('cellClick', cell.date)"
        @event-click="(ev) => emit('eventClick', cell.date, ev)"
        @more="emit('more', cell.date)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// CdMonthGrid — 7-column Monday-start month grid, matching CADENCE Handoff.dc.html's monthPoster()
// dow row (['M','T','W','T','F','S','S']) — the salvage-branch design-research-report.md §2.3/§3.5
// cited a Sunday-start header from an earlier revision; re-pinned to the handoff during task 3.1's audit.
// Weekday header: M T W T F S S (Monday-start), 10.5px 600 letter-spacing .14em, Sat=#3A6EA5, Sun=#C0564B.
// Grid: 7-col, cell height 100px (70px in dot mode — cell height variance left to CdMonthCell/consumer sizing
// via CSS grid auto-rows if needed), only border-top divider (no vertical column lines).
import CdMonthCell, { type MonthCellEvent } from './CdMonthCell.vue'

export interface MonthGridCell {
  date: string
  dayNum: number
  dow: number
  outsideMonth: boolean
  today: boolean
  events: MonthCellEvent[]
}

withDefaults(
  defineProps<{
    cells: MonthGridCell[]
    fmt?: 'time' | 'name' | 'dot'
  }>(),
  { fmt: 'time' }
)

const emit = defineEmits<{
  cellClick: [date: string]
  eventClick: [date: string, event: MonthCellEvent]
  more: [date: string]
}>()

const dowLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
</script>

<style scoped>
.cd-month-grid {
  display: flex;
  flex-direction: column;
  background: var(--cd-surface);
}

.cd-month-grid__dow-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 8px 0;
}

.cd-month-grid__dow {
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
}
</style>
